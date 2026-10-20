import { beforeEach, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { RunContext } from '@openai/agents';

// Record what the tool asks the links database module to save.
const savedPages = [];

mock.module(new URL('../src/integrations/notion/linkDatabase.js', import.meta.url).href, {
  namedExports: {
    async createLinkSummaryPage(linkSummary) {
      savedPages.push(linkSummary);
      return { id: 'page-321', url: 'https://www.notion.so/page-321', title: linkSummary.title, link: linkSummary.url };
    },
  },
});

const { saveLinkSummaryTool } = await import('../src/tools/linkTools.js');
const saveLinkSummary = saveLinkSummaryTool();

// Calls the tool the same way an agent run does: JSON arguments in, string (or error text) out.
function invokeTool(args) {
  return saveLinkSummary.invoke(new RunContext(), JSON.stringify(args));
}

beforeEach(() => {
  savedPages.length = 0;
});

test('save_link_summary saves the title, summary and URL it is given', async () => {
  const output = await invokeTool({
    title: 'OpenAI Node SDK',
    summary: 'Official Node.js client.',
    url: 'https://github.com/openai/openai-node',
  });

  assert.deepEqual(savedPages, [{
    title: 'OpenAI Node SDK',
    summary: 'Official Node.js client.',
    url: 'https://github.com/openai/openai-node',
  }]);
  assert.equal(JSON.parse(output).ok, true);
});

test('save_link_summary rejects a call without a URL', async () => {
  const output = await invokeTool({ title: 'OpenAI Node SDK', summary: 'Official Node.js client.' });

  assert.match(output, /An error occurred while running the tool/);
  assert.equal(savedPages.length, 0);
});

test('save_link_summary rejects a non-http(s) URL', async () => {
  const output = await invokeTool({ title: 'Notes', summary: 'A file.', url: 'ftp://example.com/notes.txt' });

  assert.match(output, /Only http and https URLs are supported/);
  assert.equal(savedPages.length, 0);
});
