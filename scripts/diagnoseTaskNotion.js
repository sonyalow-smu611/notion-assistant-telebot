import 'dotenv/config';
import { env } from '../src/config/env.js';
import { notion } from '../src/integrations/notion/client.js';
import { createTask } from '../src/integrations/notion/taskDatabase.js';

function safeError(error) {
  return {
    status: error.status,
    code: error.code,
    message: error.message,
    body: error.body,
  };
}

try {
  const dataSource = await notion.dataSources.retrieve({
    data_source_id: env.NOTION_TASKS_DATA_SOURCE_ID,
  });

  console.log(JSON.stringify({
    ok: true,
    taskDataSourceIdSuffix: env.NOTION_TASKS_DATA_SOURCE_ID.slice(-6),
    properties: Object.fromEntries(
      Object.entries(dataSource.properties || {}).map(([name, property]) => [
        name,
        property.type,
      ]),
    ),
  }, null, 2));

  if (process.argv.includes('--create-test')) {
    const task = await createTask({
      title: 'Diagnostic task from notion-telebot',
      dueDate: null,
    });

    console.log(JSON.stringify({
      createOk: true,
      task: {
        id: task.id,
        url: task.url,
        title: task.title,
        category: task.category,
        dueDate: task.dueDate,
        status: task.status,
      },
    }, null, 2));
  }
} catch (error) {
  console.log(JSON.stringify({
    ok: false,
    taskDataSourceIdSuffix: env.NOTION_TASKS_DATA_SOURCE_ID?.slice(-6),
    error: safeError(error),
  }, null, 2));

  process.exitCode = 1;
}
