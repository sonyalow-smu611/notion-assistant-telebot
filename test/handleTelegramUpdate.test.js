import { beforeEach, mock, test } from 'node:test';
import assert from 'node:assert/strict';

// Record assistant turns and Telegram replies instead of calling OpenAI or Telegram.
const turns = [];
const replies = [];

mock.module(new URL('../src/config/env.js', import.meta.url).href, {
  namedExports: {
    env: { TELEGRAM_ALLOWED_USER_IDS: ['111'] },
  },
});

mock.module(new URL('../src/app/runAssistantTurn.js', import.meta.url).href, {
  namedExports: {
    async runAssistantTurn(message) {
      turns.push(message.text);
      return { text: `reply to ${message.text}`, agentName: 'General Agent' };
    },
  },
});

mock.module(new URL('../src/integrations/telegram/sendMessage.js', import.meta.url).href, {
  namedExports: {
    async sendTelegramMessage(chatId, text) {
      replies.push({ chatId, text });
    },
  },
});

// In-memory stand-in for the Upstash SET options the handler relies on (nx, ex).
const redisStore = new Map();

mock.module(new URL('../src/integrations/upstash/client.js', import.meta.url).href, {
  namedExports: {
    redis: {
      async set(key, value, { nx } = {}) {
        if (nx && redisStore.has(key)) {
          return null;
        }

        redisStore.set(key, value);
        return 'OK';
      },
    },
  },
});

const { handleTelegramUpdate } = await import('../src/app/handleTelegramUpdate.js');

function textUpdate({ updateId = 1, userId = 111, text = 'hello' } = {}) {
  return {
    update_id: updateId,
    message: {
      message_id: 10,
      chat: { id: 500 },
      from: { id: userId, username: 'someone' },
      text,
    },
  };
}

beforeEach(() => {
  turns.length = 0;
  replies.length = 0;
  redisStore.clear();
});

test('replies to a message from an allowed user', async () => {
  await handleTelegramUpdate(textUpdate({ userId: 111, text: 'hello' }));

  assert.deepEqual(turns, ['hello']);
  assert.deepEqual(replies, [{ chatId: '500', text: 'reply to hello' }]);
});

test('ignores a message from a user who is not on the allowlist', async () => {
  await handleTelegramUpdate(textUpdate({ userId: 999, text: 'log $5 lunch' }));

  assert.equal(turns.length, 0);
  assert.equal(replies.length, 0);
});

test('handles a retried update only once', async () => {
  await handleTelegramUpdate(textUpdate({ updateId: 42, text: 'spent $12 on lunch' }));
  await handleTelegramUpdate(textUpdate({ updateId: 42, text: 'spent $12 on lunch' }));

  assert.deepEqual(turns, ['spent $12 on lunch']);
  assert.equal(replies.length, 1);
});

test('handles different updates with the same text separately', async () => {
  await handleTelegramUpdate(textUpdate({ updateId: 1, text: 'hello' }));
  await handleTelegramUpdate(textUpdate({ updateId: 2, text: 'hello' }));

  assert.equal(turns.length, 2);
});
