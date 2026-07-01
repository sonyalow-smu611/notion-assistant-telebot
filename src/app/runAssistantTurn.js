import { triageAgent } from "../agents/triageAgent.js";
import { runAgentTurn } from "../integrations/openai/runner.js";
import { runWithTelegramTrace } from "../utils/tracing.js";
import {
  claimTelegramMessage,
  finalizeTelegramMessage,
  getSavedConversationTurn,
} from '../memory/conversationMemory.js';

// this function takes a message object, uses the `runWithTelegramTrace` utility to wrap the agent turn in a trace, runs it through the Triage Agent, and returns a response that can be sent back to the user in Telegram.
export async function runAssistantTurn(message) {

  return runWithTelegramTrace(message, async () => {
    const chatId = String(message.chatId);
    const messageId = String(message.messageId);
    const existingTurn = await getSavedConversationTurn(chatId, messageId);

    if (existingTurn?.output) {
      return {
        text: existingTurn.output,
        agentName: existingTurn.agent_name,
      };
    }

    if (existingTurn) {
      return {
        text: 'I am already processing that message.',
        agentName: existingTurn.agent_name,
      };
    }

    const claim = await claimTelegramMessage({
      userId: message.userId,
      chatId,
      messageId,
      input: message.text,
    });

    if (!claim.claimed) {
      return {
        text: claim.turn?.output || 'I am already processing that message.',
        agentName: claim.turn?.agent_name || 'Processing',
      };
    }

    try {
      const result = await runAgentTurn(triageAgent, message.text);
      const agentName = result.agentName || result.raw?.lastAgent?.name;

      await finalizeTelegramMessage({
        chatId,
        messageId,
        output: result.text,
        agentName,
      });

      return {
        text: result.text,
        agentName,
      };
    } catch (error) {
      const errorText = `I could not process that message: ${error.message}`;

      await finalizeTelegramMessage({
        chatId,
        messageId,
        output: errorText,
        agentName: 'Error',
      });

      return {
        text: errorText,
        agentName: 'Error',
      };
    }
  });
}
