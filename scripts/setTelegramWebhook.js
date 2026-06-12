import 'dotenv/config';
import { telegramBot } from '../src/integrations/telegram/client.js';

// This script sets the Telegram webhook URL for receiving updates from Telegram. 
const webhookUrl = process.argv[2];

if (!webhookUrl) {
  throw new Error('Usage: node scripts/setTelegramWebhook.js <webhook-url>');
}

await telegramBot.telegram.setWebhook(webhookUrl);
console.log(`Telegram webhook set to ${webhookUrl}`);

