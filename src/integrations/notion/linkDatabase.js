import { env } from '../../config/env.js';
import { notion } from './client.js';

const NOTION_TEXT_LIMIT = 2000;

async function getLinkDataSourceProperties() {
  const dataSource = await notion.dataSources.retrieve({
    data_source_id: env.NOTION_LINKS_DATA_SOURCE_ID,
  });

  return dataSource.properties || {};
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

function findPropertyName(properties, configuredName, expectedType) {
  return findConfiguredProperty(properties, configuredName, expectedType)
    || Object.entries(properties).find(([, property]) => property.type === expectedType)?.[0];
}

function richText(content) {
  return [
    {
      type: 'text',
      text: {
        content: String(content || '').slice(0, NOTION_TEXT_LIMIT),
      },
    },
  ];
}

function textChunks(content) {
  const text = String(content || '').trim();
  const chunks = [];

  for (let index = 0; index < text.length; index += NOTION_TEXT_LIMIT) {
    chunks.push(text.slice(index, index + NOTION_TEXT_LIMIT));
  }

  return chunks.length ? chunks : [''];
}

function buildTextProperty(propertyType, content) {
  if (propertyType === 'rich_text') {
    return { rich_text: richText(content) };
  }

  return null;
}

function buildOptionProperty(propertyType, value) {
  if (propertyType === 'select' || propertyType === 'status') {
    return { [propertyType]: { name: value } };
  }

  if (propertyType === 'multi_select') {
    return { multi_select: [{ name: value }] };
  }

  if (propertyType === 'rich_text') {
    return { rich_text: richText(value) };
  }

  return null;
}

function addOptionalProperty(properties, dataSourceProperties, configuredName, expectedTypes, value, builder) {
  if (!value) {
    return;
  }

  for (const expectedType of expectedTypes) {
    const propertyName = findConfiguredProperty(dataSourceProperties, configuredName, expectedType);

    if (propertyName) {
      const property = builder(dataSourceProperties[propertyName].type, value);

      if (property) {
        properties[propertyName] = property;
      }

      return;
    }
  }
}

function paragraph(content) {
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: richText(content),
    },
  };
}

function buildChildren({ summary }) {
  return textChunks(summary).map((chunk) => paragraph(chunk));
}

function buildLinkSummaryProperties({ linkSummary, dataSourceProperties }) {
  const titlePropertyName = findPropertyName(
    dataSourceProperties,
    env.NOTION_LINK_TITLE_PROPERTY,
    'title',
  );

  if (!titlePropertyName) {
    throw new Error('Links data source must have a title property.');
  }

  const properties = {
    [titlePropertyName]: {
      title: richText(linkSummary.title),
    },
  };

  addOptionalProperty(properties, dataSourceProperties, env.NOTION_LINK_SUMMARY_PROPERTY, ['rich_text'], linkSummary.summary, buildTextProperty);
  addOptionalProperty(properties, dataSourceProperties, env.NOTION_LINK_DATE_SAVED_PROPERTY, ['date'], linkSummary.dateSaved, () => ({ date: { start: linkSummary.dateSaved } }));
  addOptionalProperty(properties, dataSourceProperties, env.NOTION_LINK_STATUS_PROPERTY, ['status', 'select', 'rich_text'], linkSummary.status, buildOptionProperty);

  return properties;
}

export async function createLinkSummaryPage(linkSummary) {
  const cleanTitle = linkSummary.title?.trim();
  const cleanSummary = linkSummary.summary?.trim();

  if (!cleanTitle) {
    throw new Error('Title is required.');
  }

  if (!cleanSummary) {
    throw new Error('Summary is required.');
  }

  const dataSourceProperties = await getLinkDataSourceProperties();
  const page = await notion.pages.create({
    parent: {
      data_source_id: env.NOTION_LINKS_DATA_SOURCE_ID,
    },
    properties: buildLinkSummaryProperties({
      linkSummary: {
        ...linkSummary,
        title: cleanTitle,
        summary: cleanSummary,
      },
      dataSourceProperties,
    }),
    children: buildChildren({
      summary: cleanSummary,
    }),
  });

  return {
    id: page.id,
    title: cleanTitle,
    status: linkSummary.status,
  };
}
