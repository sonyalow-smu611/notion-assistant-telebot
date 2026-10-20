import { env } from '../../config/env.js';
import { callNotionTool } from './mcpClient.js';

// Builds the Notion MCP page properties for one task.
// Notion MCP uses a simplified format: plain strings for title/select, __YES__/__NO__ for checkboxes,
// and expanded `date:<property>:start` keys for dates.
function buildTaskProperties({ title, dueDate }) {
  const properties = {
    [env.NOTION_TASK_TITLE_PROPERTY]: title,
    [env.NOTION_TASK_CATEGORY_PROPERTY]: env.NOTION_TASK_DEFAULT_CATEGORY,
    [env.NOTION_TASK_STATUS_PROPERTY]: '__NO__',
  };

  if (dueDate) {
    properties[`date:${env.NOTION_TASK_DUE_PROPERTY}:start`] = dueDate;
    properties[`date:${env.NOTION_TASK_DUE_PROPERTY}:is_datetime`] = 0;
  }

  return properties;
}

export async function createTask({
  title,
  dueDate = null,
}) {
  const cleanTitle = title?.trim();

  if (!cleanTitle) {
    throw new Error('Task title is required.');
  }

  const result = await callNotionTool('notion-create-pages', {
    parent: {
      data_source_id: env.NOTION_TASKS_DATA_SOURCE_ID,
    },
    pages: [{
      properties: buildTaskProperties({ title: cleanTitle, dueDate }),
    }],
  });
  const page = result.pages?.[0] || {};

  // Return structured data so the agent can confirm the exact result.
  return {
    id: page.id,
    url: page.url,
    title: cleanTitle,
    category: env.NOTION_TASK_DEFAULT_CATEGORY,
    dueDate: dueDate || null,
    status: false,
  };
}
