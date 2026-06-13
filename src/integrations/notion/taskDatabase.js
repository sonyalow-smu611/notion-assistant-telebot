import { env } from '../../config/env.js';
import { notion } from './client.js';

// These names must exactly match your Notion Tasks database properties.
const TASK_PROPERTIES = {
  title: 'Name',
  status: 'Status',
  dueDate: 'Due',
};

function buildTaskProperties({ title, dueDate, status }) {
  const properties = {
    [TASK_PROPERTIES.title]: {
      title: [
        {
          type: 'text',
          text: {
            content: title,
          },
        },
      ],
    },
    [TASK_PROPERTIES.status]: {
      status: {
        name: status,
      },
    },
  };

  // Only send a due date property when one is known.
  // This avoids creating invalid Notion date values.
  if (dueDate) {
    properties[TASK_PROPERTIES.dueDate] = {
      date: {
        start: dueDate,
      },
    };
  }

  return properties;
}

export async function createTask({ title, dueDate = null, status = 'Not Started' }) {
  const cleanTitle = title?.trim();

  if (!cleanTitle) {
    throw new Error('Task title is required.');
  }

  const page = await notion.pages.create({
    parent: {
      database_id: env.NOTION_TASKS_DATABASE_ID,
    },
    properties: buildTaskProperties({
      title: cleanTitle,
      dueDate,
      status,
    }),
  });

//   Return structured data so the agent can confirm the exact result.
  return {
    id: page.id,
    url: page.url,
    title: cleanTitle,
    dueDate,
    status,
  };
}