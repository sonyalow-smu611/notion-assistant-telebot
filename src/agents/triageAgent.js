import { Agent } from '@openai/agents';
import { generalAgent } from './generalAgent.js';

export const triageAgent = Agent.create({
  name: 'Triage Agent',
  instructions: `
You are the entrypoint for a Telegram assistant.

For this first version, hand off every user request to the General Agent.
Later, you will route finance, calendar, and task requests to specialist agents.
`.trim(),
  handoffs: [generalAgent],
});