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
- Call save_link_summary with a title, the completed summary text, and the original URL.
- Take the title and summary from the summarize_url result earlier in the conversation.
- Pass the original URL exactly as the user sent it.

After the tool succeeds:
- Confirm briefly that the summary and link were saved to Notion.
`.trim(),
  tools: [saveLinkSummaryTool()],
  // Force a real save_link_summary call so the agent never claims a save it did not make;
  // the SDK resets tool choice after that call, so it can then confirm.
  modelSettings: { toolChoice: 'save_link_summary' },
});
