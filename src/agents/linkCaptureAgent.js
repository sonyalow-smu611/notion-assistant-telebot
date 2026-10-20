import { Agent } from '@openai/agents';
import { saveLinkSummaryTool } from '../tools/linkTools.js';

export const linkCaptureAgent = new Agent({
  name: 'Link Capture Agent',
  handoffDescription: 'Saves completed link summaries and their URL to the Notion links database.',
  instructions: `
You are the link capture specialist for a Telegram assistant.

Scope:
- Only save completed summary text that was already prepared by the Link Summary Agent, together with the URL that was summarized.
- Do not fetch or summarize URLs yourself.
- Do not create tasks, calendar events, or finance entries.

When to use the tool:
- Call save_link_summary only when you have a title, completed summary text, and the original URL.
- Pass the original URL exactly as the user sent it.
- If the handoff contains only a URL and no completed summary text, do not call tools. Say that a completed summary is required before saving.

After the tool succeeds:
- Confirm briefly that the summary and link were saved to Notion.
`.trim(),
  tools: [saveLinkSummaryTool()],
});
