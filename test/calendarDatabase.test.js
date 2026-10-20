import { beforeEach, mock, test } from 'node:test';
import assert from 'node:assert/strict';

// Record every Notion MCP call instead of reaching the network.
const mcpCalls = [];

mock.module(new URL('../src/config/env.js', import.meta.url).href, {
  namedExports: {
    env: {
      NOTION_CALENDAR_DATA_SOURCE_ID: 'calendar-data-source',
      NOTION_CALENDAR_TITLE_PROPERTY: 'Event',
      NOTION_CALENDAR_DATE_PROPERTY: 'Date',
    },
  },
});

mock.module(new URL('../src/integrations/notion/mcpClient.js', import.meta.url).href, {
  namedExports: {
    async callNotionTool(name, args) {
      mcpCalls.push({ name, args });
      return { pages: [{ id: 'page-789', url: 'https://www.notion.so/page-789' }] };
    },
  },
});

const { createCalendarEvent } = await import('../src/integrations/notion/calendarDatabase.js');

beforeEach(() => {
  mcpCalls.length = 0;
});

test('creates a calendar event in the calendar data source through Notion MCP', async () => {
  const event = await createCalendarEvent({ title: ' Dinner with Sam ', date: '2026-10-24' });

  assert.deepEqual(mcpCalls, [{
    name: 'notion-create-pages',
    args: {
      parent: { data_source_id: 'calendar-data-source' },
      pages: [{
        properties: {
          Event: 'Dinner with Sam',
          'date:Date:start': '2026-10-24',
          'date:Date:is_datetime': 0,
        },
      }],
    },
  }]);

  assert.deepEqual(event, {
    id: 'page-789',
    url: 'https://www.notion.so/page-789',
    title: 'Dinner with Sam',
    date: '2026-10-24',
  });
});

test('rejects an empty event title without calling Notion', async () => {
  await assert.rejects(createCalendarEvent({ title: ' ', date: '2026-10-24' }), /Calendar event title is required/);
  assert.equal(mcpCalls.length, 0);
});

test('rejects a date that is not YYYY-MM-DD without calling Notion', async () => {
  await assert.rejects(createCalendarEvent({ title: 'Photoshoot', date: 'saturday' }), /Calendar event date must be YYYY-MM-DD/);
  assert.equal(mcpCalls.length, 0);
});
