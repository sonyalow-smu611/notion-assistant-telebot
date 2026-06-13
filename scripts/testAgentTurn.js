import 'dotenv/config';
import { runAssistantTurn } from '../src/app/runAssistantTurn.js';

// test script to simulate agents and tools are working together correctly without needing to send actual Telegram messages: modify the `text` variable to test different inputs and see how the agents respond.
const result = await runAssistantTurn({
  chatId: 'test-chat',
  userId: 'test-user',
  username: 'local',
  text: process.argv.slice(2).join(' ') || 'hello',
  messageId: 'test-message',
});

console.log(result.text, result.agentName);