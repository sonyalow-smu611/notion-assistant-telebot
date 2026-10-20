import { tool } from '@openai/agents';
import { z } from 'zod';
import { createLinkSummaryPage } from '../integrations/notion/linkDatabase.js';
import { validateUrl } from '../utils/validateUrl.js';

function cleanText(value) {
  return String(value || '').trim();
}

export function saveLinkSummaryTool() {
  return tool({
    name: 'save_link_summary',
    description: 'Save an already-written link summary and its original URL to the Notion links database. This tool does not fetch or summarize URLs.',
    parameters: z.object({
      title: z.string().min(1).describe('A short title for the summarized content.'),
      summary: z.string().min(1).describe('The completed summary text to save.'),
      url: z.string().min(1).describe('The original http or https URL that was summarized.'),
    }).strict(),

    async execute({ title, summary, url }) {
      const page = await createLinkSummaryPage({
        title: cleanText(title),
        summary: cleanText(summary),
        url: validateUrl(cleanText(url)),
      });

      return JSON.stringify({
        ok: true,
        linkSummary: page,
      });
    },
  });
}
