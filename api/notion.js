import { createHmac, timingSafeEqual } from 'crypto';

// Disable automatic body parsing so signature checks can use the exact raw body.
// This matters because webhook signatures should be computed from the unchanged request body.
export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString('utf8');
}

function parseJsonBody(rawBody) {
  if (!rawBody) {
    return {};
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new Error('Invalid JSON body');
  }
}

function isTrustedNotionPayload({ rawBody, signature, verificationToken }) {
  // During the first setup request, you will not have a stored verification token yet.
  // Once NOTION_WEBHOOK_VERIFICATION_TOKEN is configured, validate event signatures.
  if (!verificationToken) {
    return true;
  }

  if (!signature) {
    return false;
  }

  const calculatedSignature = `sha256=${createHmac('sha256', verificationToken)
    .update(rawBody)
    .digest('hex')}`;

  const calculatedBuffer = Buffer.from(calculatedSignature);
  const signatureBuffer = Buffer.from(signature);

  if (calculatedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return timingSafeEqual(calculatedBuffer, signatureBuffer);
}

// Notion webhook endpoint.
// Public URL after deploy:
// https://notion-assistant-telebot.vercel.app/api/notion
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let rawBody;
  let body;

  try {
    rawBody = await readRawBody(req);
    body = parseJsonBody(rawBody);
  } catch (error) {
    console.error('Invalid Notion webhook request:', error);
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  // Notion sends this once when you create a webhook subscription.
  // Copy the token from Vercel logs and store it as NOTION_WEBHOOK_VERIFICATION_TOKEN.
  if (body.verification_token) {
    console.log('Notion webhook verification token:', body.verification_token);

    return res.status(200).json({
      ok: true,
      message: 'Verification token received. Check server logs.',
    });
  }

  const verificationToken = process.env.NOTION_WEBHOOK_VERIFICATION_TOKEN;
  const signature = req.headers['x-notion-signature'];

  if (
    !isTrustedNotionPayload({
      rawBody,
      signature,
      verificationToken,
    })
  ) {
    console.warn('Rejected untrusted Notion webhook payload');

    return res.status(401).json({
      error: 'Invalid Notion webhook signature',
    });
  }

  // Keep v1 narrow: acknowledge and log the event.
  // Later, route specific event types into app code.
  console.log('Notion webhook event received:', {
    id: body.id,
    type: body.type,
    entity: body.entity,
    timestamp: body.timestamp,
    attemptNumber: body.attempt_number,
  });

  return res.status(200).json({ ok: true });
}
