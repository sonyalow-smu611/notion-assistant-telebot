import { triageAgent } from "../agents/triageAgent.js";
import { runAgentTurn } from "../integrations/openai/runner.js";
import { runWithTelegramTrace } from "../utils/tracing.js";
import { saveConversationTurn } from '../memory/conversationMemory.js';

// this function takes a message object, uses the `runWithTelegramTrace` utility to wrap the agent turn in a trace, runs it through the Triage Agent, and returns a response that can be sent back to the user in Telegram.
export async function runAssistantTurn(message) {

  return runWithTelegramTrace(message, async () => {
    const result = await runAgentTurn(triageAgent, message.text);

    await saveConversationTurn({
      userId: message.userId,
      chatId: message.chatId,
      messageId: String(message.messageId),
      input: message.text,
      output: result.text,
      agentName: result.raw.lastAgent?.name
    });

    return {
      text: result.text,
      agentName: result.raw.lastAgent?.name
    };
  });
}
