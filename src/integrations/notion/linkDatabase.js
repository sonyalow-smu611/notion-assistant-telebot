import { env } from '../../config/env.js';
import { callNotionTool } from './mcpClient.js';

const NOTION_TEXT_LIMIT = 2000;

// Notion MCP requires properties named "id" or "url" (any case) to be prefixed with "userDefined:".
function mcpPropertyName(name) {
  return ['id', 'url'].includes(name.toLowerCase()) ? `userDefined:${name}` : name;
}

export async function createLinkSummaryPage({ title, summary, url }) {
  const cleanTitle = title?.trim();
  const cleanSummary = summary?.trim();
  const cleanUrl = url?.trim();

  if (!cleanTitle) {
    throw new Error('Title is required.');
  }

  if (!cleanSummary) {
    throw new Error('Summary is required.');
  }

  if (!cleanUrl) {
    throw new Error('URL is required.');
  }

  // The Summary property is capped by Notion's text limit; the full summary goes in the page body.
  const result = await callNotionTool('notion-create-pages', {
    parent: {
      data_source_id: env.NOTION_LINKS_DATA_SOURCE_ID,
    },
    pages: [{
      properties: {
        [env.NOTION_LINK_TITLE_PROPERTY]: cleanTitle,
        [env.NOTION_LINK_SUMMARY_PROPERTY]: cleanSummary.slice(0, NOTION_TEXT_LIMIT),
        [mcpPropertyName(env.NOTION_LINK_URL_PROPERTY)]: cleanUrl,
      },
      content: cleanSummary,
    }],
  });
  const page = result.pages?.[0] || {};

  return {
    id: page.id,
    url: page.url,
    title: cleanTitle,
    link: cleanUrl,
  };
}
