// the actual webhook handler for incoming Telegram updates, which parses the update and routes it to the appropriate agent(s) based on the content of the message. 
import { parseTelegramUpdate } from '../integrations/telegram/parseUpdate.js';
import { sendTelegramMessage } from '../integrations/telegram/sendMessage.js';
import { runAssistantTurn } from './runAssistantTurn.js';

export async function handleTelegramUpdate(update) {
  const message = parseTelegramUpdate(update);

  if (!message) {
    return;
  }

  const reply = await runAssistantTurn(message);

  await sendTelegramMessage(message.chatId, reply.text);
}