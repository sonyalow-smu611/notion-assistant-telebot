import { tool } from '@openai/agents';
import { z } from 'zod';
import { createLinkPage } from '../integrations/notion/linkDatabase.js';
import { summarizeLink } from '../integrations/openai/linkSummarizer.js';
import { classifySourceType, extractLinkContent } from '../integrations/web/linkExtractor.js';

function validateUrl(url) {
  const parsed = new URL(url);

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http and https URLs are supported.');
  }

  return parsed.toString();
}

export function saveLinkTool() {
  return tool({
    name: 'save_link',
    description: 'Save one public URL to the Notion links database with a summary.',
    parameters: z.object({
      url: z.string().min(1).describe('The http or https URL to save.'),
    }).strict(),

    async execute({ url }) {
      const cleanUrl = validateUrl(url);
      const parsedUrl = new URL(cleanUrl);
      let link;

      try {
        const extracted = await extractLinkContent(cleanUrl);
        const summary = await summarizeLink(extracted);
        link = {
          url: extracted.url,
          title: extracted.title,
          summary,
          description: extracted.description,
          sourceType: extracted.sourceType,
          domain: extracted.domain,
          dateSaved: new Date().toISOString().slice(0, 10),
          status: extracted.extractionStatus,
          extractionNotes: extracted.extractionStatus === 'limited'
            ? 'Only limited public content or metadata was available.'
            : null,
        };
      } catch (error) {
        link = {
          url: cleanUrl,
          title: parsedUrl.hostname,
          summary: `The URL was saved, but public extraction failed: ${error.message}`,
          description: null,
          sourceType: classifySourceType(parsedUrl),
          domain: parsedUrl.hostname.replace(/^www\./, ''),
          dateSaved: new Date().toISOString().slice(0, 10),
          status: 'failed',
          extractionNotes: error.message,
        };
      }

      const page = await createLinkPage(link);

      return JSON.stringify({
        ok: true,
        link: page,
      });
    },
  });
}
