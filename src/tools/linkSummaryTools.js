import { tool } from '@openai/agents';
import { z } from 'zod';
import { summarizeLink } from '../integrations/openai/linkSummarizer.js';
import { classifySourceType, extractLinkContent } from '../integrations/web/linkExtractor.js';

function validateUrl(url) {
  const parsed = new URL(url);

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http and https URLs are supported.');
  }

  return parsed.toString();
}

function buildFallbackExtraction({ url, error }) {
  const parsedUrl = new URL(url);

  return {
    url,
    sourceType: classifySourceType(parsedUrl),
    title: parsedUrl.hostname,
    description: null,
    text: `Public extraction failed: ${error.message}`,
    extractionStatus: 'failed',
  };
}

export function summarizeUrlTool() {
  return tool({
    name: 'summarize_url',
    description: 'Extract public content from one URL and return a concise summary. This tool does not save anything to Notion.',
    parameters: z.object({
      url: z.string().min(1).describe('The http or https URL to summarize.'),
    }).strict(),

    async execute({ url }) {
      const cleanUrl = validateUrl(url);
      let extracted;

      try {
        extracted = await extractLinkContent(cleanUrl);
      } catch (error) {
        extracted = buildFallbackExtraction({
          url: cleanUrl,
          error,
        });
      }

      const summary = await summarizeLink(extracted);

      return JSON.stringify({
        title: extracted.title,
        summary,
        sourceType: extracted.sourceType,
        status: extracted.extractionStatus,
        note: extracted.extractionStatus === 'limited'
          ? 'Only limited public content or metadata was available.'
          : null,
      });
    },
  });
}
