import { env } from '../../config/env.js';
import { notion } from './client.js';

function buildTaskProperties({ title, dueDate, status }) {
  const properties = {
    [env.NOTION_TASK_TITLE_PROPERTY]: {
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

  // Only send status when configured so databases without a Status property can still work.
  if (status && env.NOTION_TASK_STATUS_PROPERTY) {
    properties[env.NOTION_TASK_STATUS_PROPERTY] = {
      status: {
        name: status,
      },
    };
  }

  // Only send a due date property when one is known to avoid invalid Notion date values.
  if (dueDate) {
    properties[env.NOTION_TASK_DUE_PROPERTY] = {
      date: {
        start: dueDate,
      },
    };
  }

  return properties;
}

export async function createTask({
  title,
  dueDate = null,
  status = env.NOTION_TASK_DEFAULT_STATUS,
}) {
  const cleanTitle = title?.trim();

  if (!cleanTitle) {
    throw new Error('Task title is required.');
  }

  const page = await notion.pages.create({
    parent: {
      data_source_id: env.NOTION_TASKS_DATA_SOURCE_ID,
    },
    properties: buildTaskProperties({
      title: cleanTitle,
      dueDate,
      status,
    }),
  });

  // Return structured data so the agent can confirm the exact result.
  return {
    id: page.id,
    url: page.url,
    title: cleanTitle,
    dueDate,
    status,
  };
}
