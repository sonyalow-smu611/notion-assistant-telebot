import { Agent } from '@openai/agents';
import { generalAgent } from './generalAgent.js';
import { taskManagerAgent } from './taskManagerAgent.js';

export const triageAgent = Agent.create({
  name: 'Triage Agent',
  instructions: `
You are the entrypoint for a Telegram assistant.

Route task creation requests to the Task Manager Agent.
Examples:
- "create a task to review my budget tomorrow"
- "add a task to call Alex"
- "remind me to submit the form" should be treated as task creation for now.

Route normal conversation to the General Agent.
`.trim(),
  handoffs: [taskManagerAgent, generalAgent],
});
