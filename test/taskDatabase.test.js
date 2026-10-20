import { beforeEach, mock, test } from 'node:test';
import assert from 'node:assert/strict';

// Record every Notion MCP call instead of reaching the network.
const mcpCalls = [];

mock.module(new URL('../src/config/env.js', import.meta.url).href, {
  namedExports: {
    env: {
      NOTION_TASKS_DATA_SOURCE_ID: 'tasks-data-source',
      NOTION_TASK_TITLE_PROPERTY: 'Task',
      NOTION_TASK_CATEGORY_PROPERTY: 'Category',
      NOTION_TASK_DEFAULT_CATEGORY: 'general',
      NOTION_TASK_STATUS_PROPERTY: 'Status',
      NOTION_TASK_DUE_PROPERTY: 'Due Date',
    },
  },
});

mock.module(new URL('../src/integrations/notion/mcpClient.js', import.meta.url).href, {
  namedExports: {
    async callNotionTool(name, args) {
      mcpCalls.push({ name, args });
      return { pages: [{ id: 'page-123', url: 'https://www.notion.so/page-123' }] };
    },
  },
});

const { createTask } = await import('../src/integrations/notion/taskDatabase.js');

beforeEach(() => {
  mcpCalls.length = 0;
});

test('creates a task with a due date in the tasks data source through Notion MCP', async () => {
  const task = await createTask({ title: '  Call Alex  ', dueDate: '2026-10-21' });

  assert.deepEqual(mcpCalls, [{
    name: 'notion-create-pages',
    args: {
      parent: { data_source_id: 'tasks-data-source' },
      pages: [{
        properties: {
          Task: 'Call Alex',
          Category: 'general',
          Status: '__NO__',
          'date:Due Date:start': '2026-10-21',
          'date:Due Date:is_datetime': 0,
        },
      }],
    },
  }]);

  assert.deepEqual(task, {
    id: 'page-123',
    url: 'https://www.notion.so/page-123',
    title: 'Call Alex',
    category: 'general',
    dueDate: '2026-10-21',
    status: false,
  });
});

test('creates a task without due date properties when no due date is given', async () => {
  const task = await createTask({ title: 'Review budget', dueDate: null });

  assert.deepEqual(mcpCalls[0].args.pages[0].properties, {
    Task: 'Review budget',
    Category: 'general',
    Status: '__NO__',
  });
  assert.equal(task.dueDate, null);
});

test('rejects an empty task title without calling Notion', async () => {
  await assert.rejects(createTask({ title: '   ' }), /Task title is required/);
  assert.equal(mcpCalls.length, 0);
});
