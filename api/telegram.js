import { handleTelegramUpdate } from '../src/app/handleTelegramUpdate.js';

// entry point for Telegram webhook requests: receives incoming updates from Telegram, processes them using the `handleTelegramUpdate` function, and sends appropriate responses back to Telegram.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await handleTelegramUpdate(req.body);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook failed:', error);
    return res.status(500).json({ error: 'Telegram webhook failed' });
  }
}
