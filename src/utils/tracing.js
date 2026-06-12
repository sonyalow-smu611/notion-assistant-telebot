import { withTrace } from '@openai/agents';

// utility function to wrap agent turns in a trace for better observability and debugging of the assistant's behavior in response to Telegram messages. This allows us to see the flow of data and decisions made by the agents when handling a Telegram update.
export async function runWithTelegramTrace(message, fn) {
  return withTrace('telegram_assistant_turn', async () => {
    return fn();
  });
}