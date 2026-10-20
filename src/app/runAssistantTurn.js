import { triageAgent } from "../agents/triageAgent.js";
import { runAgentTurn } from "../integrations/openai/runner.js";
import { runWithTelegramTrace } from "../utils/tracing.js";

// this function takes a message object, uses the `runWithTelegramTrace` utility to wrap the agent turn in a trace, runs it through the Triage Agent, and returns a response that can be sent back to the user in Telegram.
export async function runAssistantTurn(message) {

  return runWithTelegramTrace(message, async () => {
    try {
      const result = await runAgentTurn(triageAgent, message.text);
      const agentName = result.agentName || result.raw?.lastAgent?.name;

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
