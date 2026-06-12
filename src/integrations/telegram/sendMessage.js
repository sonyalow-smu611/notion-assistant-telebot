// step: sending message back to user in telegram chat
import { telegramBot } from './client.js';

export async function sendTelegramMessage(chatId, text) {
  return telegramBot.telegram.sendMessage(chatId, text);
}