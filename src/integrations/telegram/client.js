import { Telegraf } from 'telegraf';
import { env } from '../../config/env.js';

// Initialize Telegram bot client
export const telegramBot = new Telegraf(env.TELEGRAM_BOT_TOKEN);