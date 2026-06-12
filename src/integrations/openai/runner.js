import { run } from '@openai/agents';

// this function takes a message object, runs it through the Triage Agent, and returns a response that can be sent back to the user in Telegram.
export async function runAgentTurn(agent, text) {
  const result = await run(agent, text);

  return {
    text: result.finalOutput || 'I could not generate a reply.',
    raw: result,
  };
}