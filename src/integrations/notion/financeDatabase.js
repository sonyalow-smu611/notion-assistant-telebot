import { env } from '../../config/env.js';
import { callNotionTool } from './mcpClient.js';

const FINANCE_CATEGORIES = [
  'food',
  'entertainment',
  'gifts',
  'transport',
  'miscellaneous',
  'work',
];

export async function createExpense({
  expense,
  amount,
  category,
}) {
  const cleanExpense = expense?.trim();
  const cleanCategory = category?.trim().toLowerCase();

  if (!cleanExpense) {
    throw new Error('Expense is required.');
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Amount must be a positive number.');
  }

  if (!FINANCE_CATEGORIES.includes(cleanCategory)) {
    throw new Error(`Category must be one of: ${FINANCE_CATEGORIES.join(', ')}.`);
  }

  // Notion MCP takes plain strings for title/select and JavaScript numbers for number properties.
  const result = await callNotionTool('notion-create-pages', {
    parent: {
      data_source_id: env.NOTION_FINANCE_DATA_SOURCE_ID,
    },
    pages: [{
      properties: {
        [env.NOTION_FINANCE_EXPENSE_PROPERTY]: cleanExpense,
        [env.NOTION_FINANCE_AMOUNT_PROPERTY]: amount,
        [env.NOTION_FINANCE_CATEGORY_PROPERTY]: cleanCategory,
      },
    }],
  });
  const page = result.pages?.[0] || {};

  return {
    id: page.id,
    url: page.url,
    expense: cleanExpense,
    amount,
    category: cleanCategory,
  };
}
