import { triageAgent } from "../agents/triageAgent.js";
import { runAgentTurn } from "../integrations/openai/runner.js";
import { redis } from "../integrations/upstash/client.js";
import { runWithTelegramTrace } from "../utils/tracing.js";

// Recent turns per chat, so an answer to a clarifying question arrives with that question.
const HISTORY_MESSAGES = 10;
const HISTORY_TTL_SECONDS = 3600;

function historyKey(chatId) {
  return `chat:history:${chatId}`;
}

// this function takes a message object, uses the `runWithTelegramTrace` utility to wrap the agent turn in a trace, runs it through the Triage Agent, and returns a response that can be sent back to the user in Telegram.
export async function runAssistantTurn(message) {

  return runWithTelegramTrace(message, async () => {
    try {
      const history = (await redis.get(historyKey(message.chatId))) || [];
      const result = await runAgentTurn(triageAgent, message.text, history);
      const agentName = result.agentName || result.raw?.lastAgent?.name;

      await redis.set(historyKey(message.chatId), [
        ...history,
        { role: 'user', text: message.text },
        { role: 'assistant', text: result.text },
      ].slice(-HISTORY_MESSAGES), { ex: HISTORY_TTL_SECONDS });

      return {
        text: result.text,
        agentName,
      };
    } catch (error) {
      const errorText = `I could not process that message: ${error.message}`;

      return {
        text: errorText,
        agentName: 'Error',
      };
    }
  });
}
