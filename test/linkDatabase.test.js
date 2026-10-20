import { beforeEach, mock, test } from 'node:test';
import assert from 'node:assert/strict';

// Record every Notion MCP call instead of reaching the network.
const mcpCalls = [];

mock.module(new URL('../src/config/env.js', import.meta.url).href, {
  namedExports: {
    env: {
      NOTION_LINKS_DATA_SOURCE_ID: 'links-data-source',
      NOTION_LINK_TITLE_PROPERTY: 'Title',
      NOTION_LINK_SUMMARY_PROPERTY: 'Summary',
      NOTION_LINK_URL_PROPERTY: 'URL',
    },
  },
});

mock.module(new URL('../src/integrations/notion/mcpClient.js', import.meta.url).href, {
  namedExports: {
    async callNotionTool(name, args) {
      mcpCalls.push({ name, args });
      return { pages: [{ id: 'page-321', url: 'https://www.notion.so/page-321' }] };
    },
  },
});

const { createLinkSummaryPage } = await import('../src/integrations/notion/linkDatabase.js');

beforeEach(() => {
  mcpCalls.length = 0;
});

test('saves the title, summary and URL to the links data source, with the summary as page content', async () => {
  const page = await createLinkSummaryPage({
    title: ' OpenAI Node SDK ',
    summary: ' Official Node.js client for the OpenAI API. ',
    url: 'https://github.com/openai/openai-node',
  });

  // Notion MCP requires properties named "url" (any case) to be prefixed with "userDefined:".
  assert.deepEqual(mcpCalls, [{
    name: 'notion-create-pages',
    args: {
      parent: { data_source_id: 'links-data-source' },
      pages: [{
        properties: {
          Title: 'OpenAI Node SDK',
          Summary: 'Official Node.js client for the OpenAI API.',
          'userDefined:URL': 'https://github.com/openai/openai-node',
        },
        content: 'Official Node.js client for the OpenAI API.',
      }],
    },
  }]);

  assert.deepEqual(page, {
    id: 'page-321',
    url: 'https://www.notion.so/page-321',
    title: 'OpenAI Node SDK',
    link: 'https://github.com/openai/openai-node',
  });
});

test('caps the Summary property at 2000 characters but keeps the full summary as page content', async () => {
  const longSummary = 'a'.repeat(2500);

  await createLinkSummaryPage({ title: 'Long read', summary: longSummary, url: 'https://example.com' });

  const [created] = mcpCalls[0].args.pages;
  assert.equal(created.properties.Summary.length, 2000);
  assert.equal(created.content, longSummary);
});

test('rejects an empty title without calling Notion', async () => {
  await assert.rejects(createLinkSummaryPage({ title: ' ', summary: 'x', url: 'https://example.com' }), /Title is required/);
  assert.equal(mcpCalls.length, 0);
});

test('rejects an empty summary without calling Notion', async () => {
  await assert.rejects(createLinkSummaryPage({ title: 'x', summary: ' ', url: 'https://example.com' }), /Summary is required/);
  assert.equal(mcpCalls.length, 0);
});

test('rejects a missing URL without calling Notion', async () => {
  await assert.rejects(createLinkSummaryPage({ title: 'x', summary: 'y', url: '' }), /URL is required/);
  assert.equal(mcpCalls.length, 0);
});
