import { env } from '../../config/env.js';
import { notion } from './client.js';

async function getCalendarDataSourceProperties() {
  const dataSource = await notion.dataSources.retrieve({
    data_source_id: env.NOTION_CALENDAR_DATA_SOURCE_ID,
  });

  return dataSource.properties || {};
}

function findPropertyName(properties, configuredName, expectedType) {
  if (configuredName && properties[configuredName]?.type === expectedType) {
    return configuredName;
  }

  const normalizedName = configuredName?.toLowerCase();
  return Object.entries(properties).find(([name, property]) => (
    name.toLowerCase() === normalizedName && property.type === expectedType
  ))?.[0] || Object.entries(properties).find(([, property]) => property.type === expectedType)?.[0];
}

function buildCalendarProperties({ title, date, dataSourceProperties }) {
  const titlePropertyName = findPropertyName(
    dataSourceProperties,
    env.NOTION_CALENDAR_TITLE_PROPERTY,
    'title',
  );

  if (!titlePropertyName) {
    throw new Error('Calendar data source must have a title property.');
  }

  const datePropertyName = findPropertyName(
    dataSourceProperties,
    env.NOTION_CALENDAR_DATE_PROPERTY,
    'date',
  );

  if (!datePropertyName) {
    throw new Error('Calendar data source must have a date property.');
  }

  return {
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
    [datePropertyName]: {
      date: {
        start: date,
      },
    },
  };
}

export async function createCalendarEvent({
  title,
  date,
}) {
  const cleanTitle = title?.trim();
  const cleanDate = date?.trim();

  if (!cleanTitle) {
    throw new Error('Calendar event title is required.');
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
    throw new Error('Calendar event date must be YYYY-MM-DD.');
  }

  const dataSourceProperties = await getCalendarDataSourceProperties();
  const properties = buildCalendarProperties({
    title: cleanTitle,
    date: cleanDate,
    dataSourceProperties,
  });

  const page = await notion.pages.create({
    parent: {
      data_source_id: env.NOTION_CALENDAR_DATA_SOURCE_ID,
    },
    properties,
  });

  return {
    id: page.id,
    url: page.url,
    title: cleanTitle,
    date: cleanDate,
  };
}
