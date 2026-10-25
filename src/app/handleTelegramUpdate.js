// the actual webhook handler for incoming Telegram updates, which parses the update and routes it to the appropriate agent(s) based on the content of the message. 
import { env } from '../config/env.js';
import { redis } from '../integrations/upstash/client.js';
import { parseTelegramUpdate } from '../integrations/telegram/parseUpdate.js';
import { sendTelegramMessage } from '../integrations/telegram/sendMessage.js';
import { runAssistantTurn } from './runAssistantTurn.js';

export async function handleTelegramUpdate(update) {
  const message = parseTelegramUpdate(update);

  // Only allowlisted users may reach the agents (and through them, Notion).
  if (!message || !env.TELEGRAM_ALLOWED_USER_IDS.includes(message.userId)) {
    return;
  }

  // Telegram retries an update until it gets a 200; claim the update_id so a retry never repeats Notion writes.
  const claimed = await redis.set(`telegram:update:${update.update_id}`, 1, { nx: true, ex: 86400 });

  if (!claimed) {
    return;
  }

  const reply = await runAssistantTurn(message);

  await sendTelegramMessage(message.chatId, reply.text);
}
