import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { Agent } from '@openai/agents';
import { triageAgent } from '../src/agents/triageAgent.js';
import { runAgentTurn } from '../src/integrations/openai/runner.js';

// Routing eval: runs each labelled message through the real triage prompt and checks which specialist it hands off to.
// Specialists are swapped for tool-less stubs with the same names and handoff descriptions, so the model sees the
// same handoff tools but nothing is written to Notion or fetched. Run with `npm run eval:routing` after prompt changes.
const cases = JSON.parse(await readFile(new URL('../evals/routingCases.json', import.meta.url), 'utf8'));

const routingTriage = triageAgent.clone({
  handoffs: triageAgent.handoffs.map((specialist) => new Agent({
    name: specialist.name,
    handoffDescription: specialist.handoffDescription,
    instructions: 'Reply with the single word OK.',
    modelSettings: { maxTokens: 16 },
  })),
});

const results = await Promise.all(cases.map(async ({ text, history = [], expected }) => {
  try {
    const { raw } = await runAgentTurn(routingTriage, text, history);
    return { text, expected, actual: raw.lastAgent?.name };
  } catch (error) {
    return { text, expected, actual: `error: ${error.message}` };
  }
}));

for (const { text, expected, actual } of results) {
  console.log(`${actual === expected ? '✔' : '✖'} ${expected.padEnd(20)} ${actual === expected ? '' : `got ${actual} `}| ${text}`);
}

const passed = results.filter(({ expected, actual }) => expected === actual).length;
console.log(`\n${passed}/${results.length} routed correctly`);
process.exitCode = passed === results.length ? 0 : 1;
