import { Agent } from '@openai/agents';
import { linkCaptureAgent } from './linkCaptureAgent.js';
import { summarizeUrlTool } from '../tools/linkSummaryTools.js';

export const linkSummaryAgent = new Agent({
  name: 'Link Summary Agent',
  handoffDescription: 'Summarizes URL links and optionally hands completed summaries to Link Capture for Notion saving.',
  instructions: `
You are the link summary specialist for a Telegram assistant.

Scope:
- Summarize public http and https URLs.
- You may use summarize_url to extract and summarize URL content.
- Do not create Notion pages yourself.

Plain summary behavior:
- For URL messages without a clear save request, call summarize_url once per distinct URL and reply with the summary.
- If the tool reports limited or failed extraction, state that public content was limited.

Save behavior:
- If the user clearly asks to save, bookmark, capture, store, or add the link to Notion, first call summarize_url.
- After summarizing, hand off to Link Capture Agent with the title, completed summary text, and the original URL.
- Do not hand off before the summary is complete.
- You cannot save to Notion yourself. Never say a link was saved; only Link Capture Agent saves links.
`.trim(),
  tools: [summarizeUrlTool()],
  // Force a summarize_url call first so the agent never answers empty-handed;
  // the SDK resets tool choice after that call, so it can then reply or hand off.
  modelSettings: { toolChoice: 'summarize_url' },
  handoffs: [linkCaptureAgent],
});
