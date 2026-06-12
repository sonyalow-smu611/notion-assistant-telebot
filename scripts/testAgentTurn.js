import { runAssistantTurn } from '../src/app/runAssistantTurn.js';

// test script to simulate agents and tools are working together correctly without needing to send actual Telegram messages: modify the `text` variable to test different inputs and see how the agents respond.
const text = process.argv.slice(2).join(' ') || 'Create a task to review my expenses tomorrow';

const result = await runAssistantTurn({
  chatId: 'local-test-chat',
  userId: 'local-test-user',
  username: 'local',
  text,
  messageId: 'local-test-message',
});

console.log(result);

