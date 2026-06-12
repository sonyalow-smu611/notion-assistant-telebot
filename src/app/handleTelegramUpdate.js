// the actual webhook handler for incoming Telegram updates, which parses the update and routes it to the appropriate agent(s) based on the content of the message. 
import { parseTelegramUpdate } from '../integrations/telegram/parseUpdate.js';
import { sendTelegramMessage } from '../integrations/telegram/sendMessage.js';

// main handler for incoming Telegram updates
export async function handleTelegramUpdate(update) {
  const message = parseTelegramUpdate(update);

  if (!message) {
    return;
  }
  
  await sendTelegramMessage(message.chatId, `received: ${message.text}`);
}