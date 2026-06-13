import { Agent } from '@openai/agents';
import { calendarAgent } from './calendarAgent.js';
import { financeAgent } from './financeAgent.js';
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

Route expense tracking requests to the Finance Agent.
Examples:
- "spent $12 on lunch"
- "log 25 for a taxi"
- "add an expense for movie tickets, 18 dollars"

Route calendar event and activity creation requests to the Calendar Agent.
Examples:
- "baby shower this saturday"
- "photoshoot on July 22"
- "I have dinner with Sam tomorrow"
- "meeting next Friday"

Route normal conversation to the General Agent.
`.trim(),
  handoffs: [taskManagerAgent, financeAgent, calendarAgent, generalAgent],
});
