import { tool } from '@openai/agents';
import { z } from 'zod';
import { createTask } from '../integrations/notion/taskDatabase.js';

// Use one timezone consistently for relative dates like "today" and "tomorrow".
// This matches your current assistant context.
const DEFAULT_TIME_ZONE = 'Asia/Singapore';

function formatDateInTimeZone(date, timeZone) {
  // en-CA returns YYYY-MM-DD in modern Node runtimes.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function resolveDueDate(dueDate) {
  if (!dueDate) {
    return null;
  }

  const normalized = dueDate.trim().toLowerCase();

  // Accept already-normalized ISO dates from the model.
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  const now = new Date();

  if (normalized === 'today') {
    return formatDateInTimeZone(now, DEFAULT_TIME_ZONE);
  }

  if (normalized === 'tomorrow') {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDateInTimeZone(tomorrow, DEFAULT_TIME_ZONE);
  }

  // Keep v1 narrow: unknown natural language dates are treated as no due date.
  return null;
}

export function createTaskTool() {
  return tool({
    name: 'create_task',
    description: 'Create one task in the Notion tasks database.',
    parameters: z.object({
      title: z.string().min(1).describe('The task title to create.'),
      dueDate: z
        .string()
        .optional()
        .nullable()
        .describe('Optional due date as YYYY-MM-DD, today, or tomorrow.'),
    }).strict(),

    async execute({ title, dueDate }) {
      const resolvedDueDate = resolveDueDate(dueDate);

      const task = await createTask({
        title,
        dueDate: resolvedDueDate,
      });

      // Return structured text so the agent can confirm the exact result.
      return JSON.stringify({
        ok: true,
        task,
      });
    },
  });
}
