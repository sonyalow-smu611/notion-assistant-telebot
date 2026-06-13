import { tool } from '@openai/agents';
import { z } from 'zod';
import { createExpense } from '../integrations/notion/financeDatabase.js';

const FINANCE_CATEGORIES = [
  'food',
  'entertainment',
  'gifts',
  'transport',
  'miscellaneous',
  'work',
];

export function addExpenseTool() {
  return tool({
    name: 'add_expense',
    description: 'Create one expense entry in the Notion finance tracker database.',
    parameters: z.object({
      expense: z.string().min(1).describe('A short expense description, such as lunch or taxi.'),
      amount: z.number().positive().describe('The expense amount as a positive number.'),
      category: z
        .enum(FINANCE_CATEGORIES)
        .describe('The best category for the expense.'),
    }).strict(),

    async execute({ expense, amount, category }) {
      const createdExpense = await createExpense({
        expense,
        amount,
        category,
      });

      return JSON.stringify({
        ok: true,
        expense: createdExpense,
      });
    },
  });
}
