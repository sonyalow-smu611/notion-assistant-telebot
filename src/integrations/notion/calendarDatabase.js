import { env } from '../../config/env.js';
import { callNotionTool } from './mcpClient.js';

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

  // Notion MCP takes the title as a plain string and dates as expanded `date:<property>:start` keys.
  const result = await callNotionTool('notion-create-pages', {
    parent: {
      data_source_id: env.NOTION_CALENDAR_DATA_SOURCE_ID,
    },
    pages: [{
      properties: {
        [env.NOTION_CALENDAR_TITLE_PROPERTY]: cleanTitle,
        [`date:${env.NOTION_CALENDAR_DATE_PROPERTY}:start`]: cleanDate,
        [`date:${env.NOTION_CALENDAR_DATE_PROPERTY}:is_datetime`]: 0,
      },
    }],
  });
  const page = result.pages?.[0] || {};

  return {
    id: page.id,
    url: page.url,
    title: cleanTitle,
    date: cleanDate,
  };
}
