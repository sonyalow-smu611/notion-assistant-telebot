import { assistant, run, user } from '@openai/agents';

// this function takes a message object, runs it through the Triage Agent, and returns a response that can be sent back to the user in Telegram.
// `history` is the chat's recent { role, text } messages, oldest first.
export async function runAgentTurn(agent, text, history = []) {
  const input = [
    ...history.map((item) => (item.role === 'assistant' ? assistant(item.text) : user(item.text))),
    user(text),
  ];
  // Run the Triage Agent with the input text and get the result, which includes the final output and any intermediate steps taken by the agent.
  const result = await run(agent, input);

  return {
    text: result.finalOutput || 'I could not generate a reply.',
    raw: result,
  };
}
