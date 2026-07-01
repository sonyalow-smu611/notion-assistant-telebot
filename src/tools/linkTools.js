import { tool } from '@openai/agents';
import { z } from 'zod';
import { createLinkSummaryPage } from '../integrations/notion/linkDatabase.js';

function cleanText(value) {
  return String(value || '').trim();
}

export function saveLinkSummaryTool() {
  return tool({
    name: 'save_link_summary',
    description: 'Save an already-written link summary to the Notion links database. This tool does not accept, parse, fetch, or store URLs.',
    parameters: z.object({
      title: z.string().min(1).describe('A short title for the summarized content.'),
      summary: z.string().min(1).describe('The completed summary text to save.'),
      status: z.string().min(1).optional().describe('Optional status supplied by the summary agent.'),
    }).strict(),

    async execute({ title, summary, status }) {
      const page = await createLinkSummaryPage({
        title: cleanText(title),
        summary: cleanText(summary),
        status: cleanText(status) || 'saved',
        dateSaved: new Date().toISOString().slice(0, 10),
      });

      return JSON.stringify({
        ok: true,
        linkSummary: page,
      });
    },
  });
}
