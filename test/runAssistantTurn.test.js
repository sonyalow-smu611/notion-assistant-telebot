import { beforeEach, mock, test } from 'node:test';
import assert from 'node:assert/strict';

// Record what each agent run is given instead of calling OpenAI.
const runs = [];

mock.module(new URL('../src/agents/triageAgent.js', import.meta.url).href, {
  namedExports: { triageAgent: { name: 'Triage Agent' } },
});

mock.module(new URL('../src/utils/tracing.js', import.meta.url).href, {
  namedExports: {
    async runWithTelegramTrace(message, fn) {
      return fn();
    },
  },
});

mock.module(new URL('../src/integrations/openai/runner.js', import.meta.url).href, {
  namedExports: {
    async runAgentTurn(agent, text, history) {
      runs.push({ text, history });
      return { text: `reply ${runs.length}`, agentName: 'Finance Agent' };
    },
  },
});

// In-memory stand-in for the Upstash get/set calls (values round-trip as JSON like Upstash does).
const redisStore = new Map();

mock.module(new URL('../src/integrations/upstash/client.js', import.meta.url).href, {
  namedExports: {
    redis: {
      async get(key) {
        return redisStore.has(key) ? JSON.parse(redisStore.get(key)) : null;
      },
      async set(key, value) {
        redisStore.set(key, JSON.stringify(value));
        return 'OK';
      },
    },
  },
});

const { runAssistantTurn } = await import('../src/app/runAssistantTurn.js');

function chatMessage(chatId, text) {
  return { chatId, userId: '111', text };
}

beforeEach(() => {
  runs.length = 0;
  redisStore.clear();
});

test('a first message in a chat runs with no history', async () => {
  await runAssistantTurn(chatMessage('500', 'spent 12 on lunch'));

  assert.deepEqual(runs, [{ text: 'spent 12 on lunch', history: [] }]);
});

test('a follow-up answer reaches the agent with the earlier question and reply', async () => {
  await runAssistantTurn(chatMessage('500', 'spent 12 on lunch'));
  await runAssistantTurn(chatMessage('500', 'food'));

  assert.deepEqual(runs[1], {
    text: 'food',
    history: [
      { role: 'user', text: 'spent 12 on lunch' },
      { role: 'assistant', text: 'reply 1' },
    ],
  });
});

test('chats do not share history', async () => {
  await runAssistantTurn(chatMessage('500', 'spent 12 on lunch'));
  await runAssistantTurn(chatMessage('600', 'hello'));

  assert.deepEqual(runs[1].history, []);
});

test('keeps only the last 10 messages of history', async () => {
  for (let turn = 1; turn <= 7; turn += 1) {
    await runAssistantTurn(chatMessage('500', `message ${turn}`));
  }

  // Seven turns: six earlier turns (12 messages) exist; the oldest two are dropped.
  assert.deepEqual(runs[6].history, [
    { role: 'user', text: 'message 2' },
    { role: 'assistant', text: 'reply 2' },
    { role: 'user', text: 'message 3' },
    { role: 'assistant', text: 'reply 3' },
    { role: 'user', text: 'message 4' },
    { role: 'assistant', text: 'reply 4' },
    { role: 'user', text: 'message 5' },
    { role: 'assistant', text: 'reply 5' },
    { role: 'user', text: 'message 6' },
    { role: 'assistant', text: 'reply 6' },
  ]);
});
