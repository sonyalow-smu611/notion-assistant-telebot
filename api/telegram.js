import { timingSafeEqual } from 'node:crypto';
import { waitUntil } from '@vercel/functions';
import { env } from '../src/config/env.js';
import { handleTelegramUpdate } from '../src/app/handleTelegramUpdate.js';

// Telegram echoes the secret set with setWebhook in this header; anything else did not come from Telegram.
function hasTelegramSecret(req) {
  const received = Buffer.from(String(req.headers?.['x-telegram-bot-api-secret-token'] || ''));
  const expected = Buffer.from(env.TELEGRAM_WEBHOOK_SECRET);

  return received.length === expected.length && timingSafeEqual(received, expected);
}

// entry point for Telegram webhook requests: receives incoming updates from Telegram, processes them using the `handleTelegramUpdate` function, and sends appropriate responses back to Telegram.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!hasTelegramSecret(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Answer Telegram now so it does not retry a slow turn; the turn finishes in the background (still within maxDuration).
  waitUntil(handleTelegramUpdate(req.body).catch((error) => {
    console.error('Telegram webhook failed:', error);
  }));

  return res.status(200).json({ ok: true });
}
