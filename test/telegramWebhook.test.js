import { beforeEach, mock, test } from 'node:test';
import assert from 'node:assert/strict';

// Record the updates the route hands to app code instead of running a turn.
const handledUpdates = [];
// Lets a test hold a turn open to check the route has already answered Telegram.
let pendingTurn = null;
// Background work the route hands to Vercel's waitUntil.
const backgroundWork = [];

mock.module('@vercel/functions', {
  namedExports: {
    waitUntil(promise) {
      backgroundWork.push(promise);
    },
  },
});

mock.module(new URL('../src/config/env.js', import.meta.url).href, {
  namedExports: {
    env: { TELEGRAM_WEBHOOK_SECRET: 'webhook-secret' },
  },
});

mock.module(new URL('../src/app/handleTelegramUpdate.js', import.meta.url).href, {
  namedExports: {
    async handleTelegramUpdate(update) {
      handledUpdates.push(update);
      await pendingTurn;
    },
  },
});

const { default: handler } = await import('../api/telegram.js');

// Minimal stand-in for the Vercel response object.
function fakeResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function telegramRequest(secret) {
  return {
    method: 'POST',
    headers: secret ? { 'x-telegram-bot-api-secret-token': secret } : {},
    body: { update_id: 1, message: { text: 'hi' } },
  };
}

beforeEach(() => {
  handledUpdates.length = 0;
  backgroundWork.length = 0;
  pendingTurn = null;
});

test('rejects a webhook request without the Telegram secret token', async () => {
  const res = fakeResponse();
  await handler(telegramRequest(null), res);

  assert.equal(res.statusCode, 401);
  assert.equal(handledUpdates.length, 0);
});

test('rejects a webhook request with the wrong Telegram secret token', async () => {
  const res = fakeResponse();
  await handler(telegramRequest('guessed'), res);

  assert.equal(res.statusCode, 401);
  assert.equal(handledUpdates.length, 0);
});

test('passes a webhook request with the right secret token to app code', async () => {
  const res = fakeResponse();
  await handler(telegramRequest('webhook-secret'), res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(handledUpdates, [{ update_id: 1, message: { text: 'hi' } }]);
});

test('answers Telegram before the assistant turn finishes', async () => {
  let finishTurn;
  pendingTurn = new Promise((resolve) => { finishTurn = resolve; });
  const res = fakeResponse();
  const tooSlow = new Promise((resolve) => setTimeout(resolve, 100));

  await Promise.race([handler(telegramRequest('webhook-secret'), res), tooSlow]);

  assert.equal(res.statusCode, 200);
  assert.equal(backgroundWork.length, 1);
  finishTurn();
  await backgroundWork[0];
});

test('keeps answering 200 when the background turn fails', async () => {
  pendingTurn = Promise.reject(new Error('Telegram send failed'));
  const res = fakeResponse();

  await handler(telegramRequest('webhook-secret'), res);

  assert.equal(res.statusCode, 200);
  await assert.doesNotReject(backgroundWork[0]);
});
