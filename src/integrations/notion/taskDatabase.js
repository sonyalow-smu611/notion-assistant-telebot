import { env } from '../../config/env.js';
import { notion } from './client.js';

async function getTaskDataSourceProperties() {
  const dataSource = await notion.dataSources.retrieve({
    data_source_id: env.NOTION_TASKS_DATA_SOURCE_ID,
  });

  return dataSource.properties || {};
}

function findPropertyName(properties, configuredName, expectedType) {
  if (configuredName && properties[configuredName]?.type === expectedType) {
    return configuredName;
  }

  return Object.entries(properties).find(([, property]) => property.type === expectedType)?.[0];
}

function findConfiguredProperty(properties, configuredName, expectedType) {
  if (configuredName && properties[configuredName]?.type === expectedType) {
    return configuredName;
  }

  const normalizedName = configuredName?.toLowerCase();
  return Object.entries(properties).find(([name, property]) => (
    name.toLowerCase() === normalizedName && property.type === expectedType
  ))?.[0];
}

function buildCategoryProperty(propertyType) {
  if (propertyType === 'select') {
    return { select: { name: env.NOTION_TASK_DEFAULT_CATEGORY } };
  }

  if (propertyType === 'multi_select') {
    return { multi_select: [{ name: env.NOTION_TASK_DEFAULT_CATEGORY }] };
  }

  if (propertyType === 'rich_text') {
    return {
      rich_text: [
        {
          type: 'text',
          text: {
            content: env.NOTION_TASK_DEFAULT_CATEGORY,
          },
        },
      ],
    };
  }

  return null;
}

function buildTaskProperties({ title, dueDate, dataSourceProperties }) {
  const titlePropertyName = findPropertyName(
    dataSourceProperties,
    env.NOTION_TASK_TITLE_PROPERTY,
    'title',
  );

  if (!titlePropertyName) {
    throw new Error('Tasks data source must have a Task title property.');
  }

  const properties = {
    [titlePropertyName]: {
      title: [
        {
          type: 'text',
          text: {
            content: title,
          },
        },
      ],
    },
  };
  const applied = {
    category: null,
    dueDate: null,
    status: false,
  };

  const categoryPropertyName = findConfiguredProperty(
    dataSourceProperties,
    env.NOTION_TASK_CATEGORY_PROPERTY,
    'select',
  ) || findConfiguredProperty(
    dataSourceProperties,
    env.NOTION_TASK_CATEGORY_PROPERTY,
    'multi_select',
  ) || findConfiguredProperty(
    dataSourceProperties,
    env.NOTION_TASK_CATEGORY_PROPERTY,
    'rich_text',
  );

  if (categoryPropertyName) {
    const categoryProperty = buildCategoryProperty(dataSourceProperties[categoryPropertyName].type);

    if (categoryProperty) {
      properties[categoryPropertyName] = categoryProperty;
      applied.category = env.NOTION_TASK_DEFAULT_CATEGORY;
    }
  }

  if (!applied.category) {
    throw new Error('Tasks data source must have a Category select, multi-select, or text property.');
  }

  const statusPropertyName = findConfiguredProperty(
    dataSourceProperties,
    env.NOTION_TASK_STATUS_PROPERTY,
    'checkbox',
  );

  if (statusPropertyName) {
    properties[statusPropertyName] = { checkbox: false };
  } else {
    throw new Error('Tasks data source must have a Status checkbox property.');
  }

  const dueDatePropertyName = findConfiguredProperty(
    dataSourceProperties,
    env.NOTION_TASK_DUE_PROPERTY,
    'date',
  );

  if (dueDate && !dueDatePropertyName) {
    throw new Error('Tasks data source must have a Due date date property.');
  }

  if (dueDate) {
    properties[dueDatePropertyName] = {
      date: {
        start: dueDate,
      },
    };
    applied.dueDate = dueDate;
  }

  return { properties, applied };
}

export async function createTask({
  title,
  dueDate = null,
}) {
  const cleanTitle = title?.trim();

  if (!cleanTitle) {
    throw new Error('Task title is required.');
  }

  const dataSourceProperties = await getTaskDataSourceProperties();
  const { properties, applied } = buildTaskProperties({
    title: cleanTitle,
    dueDate,
    dataSourceProperties,
  });

  const page = await notion.pages.create({
    parent: {
      data_source_id: env.NOTION_TASKS_DATA_SOURCE_ID,
    },
    properties,
  });

  // Return structured data so the agent can confirm the exact result.
  return {
    id: page.id,
    url: page.url,
    title: cleanTitle,
    category: applied.category,
    dueDate: applied.dueDate,
    status: applied.status,
  };
}
