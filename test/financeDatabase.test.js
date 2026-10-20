import { beforeEach, mock, test } from 'node:test';
import assert from 'node:assert/strict';

// Record every Notion MCP call instead of reaching the network.
const mcpCalls = [];

mock.module(new URL('../src/config/env.js', import.meta.url).href, {
  namedExports: {
    env: {
      NOTION_FINANCE_DATA_SOURCE_ID: 'finance-data-source',
      NOTION_FINANCE_EXPENSE_PROPERTY: 'expense',
      NOTION_FINANCE_AMOUNT_PROPERTY: 'amount',
      NOTION_FINANCE_CATEGORY_PROPERTY: 'category',
    },
  },
});

mock.module(new URL('../src/integrations/notion/mcpClient.js', import.meta.url).href, {
  namedExports: {
    async callNotionTool(name, args) {
      mcpCalls.push({ name, args });
      return { pages: [{ id: 'page-456', url: 'https://www.notion.so/page-456' }] };
    },
  },
});

const { createExpense } = await import('../src/integrations/notion/financeDatabase.js');

beforeEach(() => {
  mcpCalls.length = 0;
});

test('creates an expense in the finance data source through Notion MCP', async () => {
  const expense = await createExpense({ expense: ' lunch ', amount: 12.5, category: 'Food' });

  assert.deepEqual(mcpCalls, [{
    name: 'notion-create-pages',
    args: {
      parent: { data_source_id: 'finance-data-source' },
      pages: [{
        properties: {
          expense: 'lunch',
          amount: 12.5,
          category: 'food',
        },
      }],
    },
  }]);

  assert.deepEqual(expense, {
    id: 'page-456',
    url: 'https://www.notion.so/page-456',
    expense: 'lunch',
    amount: 12.5,
    category: 'food',
  });
});

test('rejects an empty expense without calling Notion', async () => {
  await assert.rejects(createExpense({ expense: '  ', amount: 5, category: 'food' }), /Expense is required/);
  assert.equal(mcpCalls.length, 0);
});

test('rejects a non-positive amount without calling Notion', async () => {
  await assert.rejects(createExpense({ expense: 'taxi', amount: 0, category: 'transport' }), /Amount must be a positive number/);
  assert.equal(mcpCalls.length, 0);
});

test('rejects an unknown category without calling Notion', async () => {
  await assert.rejects(createExpense({ expense: 'rent', amount: 900, category: 'housing' }), /Category must be one of/);
  assert.equal(mcpCalls.length, 0);
});
