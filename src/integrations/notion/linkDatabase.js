import { env } from '../../config/env.js';
import { notion } from './client.js';

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
        content: String(content || '').slice(0, 2000),
      },
    },
  ];
}

function buildTextProperty(propertyType, content) {
  if (propertyType === 'rich_text') {
    return { rich_text: richText(content) };
  }

  if (propertyType === 'url') {
    return { url: content };
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

function buildChildren({ url, summary, description, extractionNotes }) {
  return [
    paragraph(`URL: ${url}`),
    paragraph(summary),
    description ? paragraph(`Description: ${description}`) : null,
    extractionNotes ? paragraph(`Extraction notes: ${extractionNotes}`) : null,
  ].filter(Boolean);
}

function buildLinkProperties({ link, dataSourceProperties }) {
  const titlePropertyName = findPropertyName(
    dataSourceProperties,
    env.NOTION_LINK_TITLE_PROPERTY,
    'title',
  );

  if (!titlePropertyName) {
    throw new Error('Links data source must have a title property.');
  }

  const urlPropertyName = findConfiguredProperty(
    dataSourceProperties,
    env.NOTION_LINK_URL_PROPERTY,
    'url',
  ) || findConfiguredProperty(
    dataSourceProperties,
    env.NOTION_LINK_URL_PROPERTY,
    'rich_text',
  );

  if (!urlPropertyName) {
    throw new Error('Links data source must have a URL property.');
  }

  const properties = {
    [titlePropertyName]: {
      title: richText(link.title),
    },
    [urlPropertyName]: buildTextProperty(dataSourceProperties[urlPropertyName].type, link.url),
  };

  addOptionalProperty(properties, dataSourceProperties, env.NOTION_LINK_SUMMARY_PROPERTY, ['rich_text'], link.summary, buildTextProperty);
  addOptionalProperty(properties, dataSourceProperties, env.NOTION_LINK_SOURCE_TYPE_PROPERTY, ['select', 'multi_select', 'rich_text'], link.sourceType, buildOptionProperty);
  addOptionalProperty(properties, dataSourceProperties, env.NOTION_LINK_DOMAIN_PROPERTY, ['rich_text', 'url'], link.domain, buildTextProperty);
  addOptionalProperty(properties, dataSourceProperties, env.NOTION_LINK_DATE_SAVED_PROPERTY, ['date'], link.dateSaved, () => ({ date: { start: link.dateSaved } }));
  addOptionalProperty(properties, dataSourceProperties, env.NOTION_LINK_STATUS_PROPERTY, ['status', 'select', 'rich_text'], link.status, buildOptionProperty);

  return properties;
}

export async function createLinkPage(link) {
  const cleanUrl = link.url?.trim();
  const cleanTitle = link.title?.trim() || cleanUrl;

  if (!cleanUrl) {
    throw new Error('URL is required.');
  }

  const dataSourceProperties = await getLinkDataSourceProperties();
  const page = await notion.pages.create({
    parent: {
      data_source_id: env.NOTION_LINKS_DATA_SOURCE_ID,
    },
    properties: buildLinkProperties({
      link: {
        ...link,
        title: cleanTitle,
        url: cleanUrl,
      },
      dataSourceProperties,
    }),
    children: buildChildren({
      url: cleanUrl,
      summary: link.summary,
      description: link.description,
      extractionNotes: link.extractionNotes,
    }),
  });

  return {
    id: page.id,
    url: page.url,
    title: cleanTitle,
    sourceUrl: cleanUrl,
    status: link.status,
  };
}
