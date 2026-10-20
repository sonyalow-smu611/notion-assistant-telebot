import 'dotenv/config';
import { env } from '../src/config/env.js';
import { callNotionTool, listNotionTools } from '../src/integrations/notion/mcpClient.js';
import { createTask } from '../src/integrations/notion/taskDatabase.js';

// Checks the live Notion MCP connection:
// 1. lists the MCP tools and prints the schemas the database modules depend on,
// 2. fetches each data source and reports configured property names missing from its schema,
// 3. with --create-test, creates one diagnostic task.
const SCHEMA_TOOLS = ['notion-create-pages', 'notion-fetch'];

// The property names each database module writes, taken from env config.
const DATA_SOURCES = [
  {
    name: 'tasks',
    id: env.NOTION_TASKS_DATA_SOURCE_ID,
    properties: [
      env.NOTION_TASK_TITLE_PROPERTY,
      env.NOTION_TASK_CATEGORY_PROPERTY,
      env.NOTION_TASK_STATUS_PROPERTY,
      env.NOTION_TASK_DUE_PROPERTY,
    ],
  },
  {
    name: 'finance',
    id: env.NOTION_FINANCE_DATA_SOURCE_ID,
    properties: [
      env.NOTION_FINANCE_EXPENSE_PROPERTY,
      env.NOTION_FINANCE_AMOUNT_PROPERTY,
      env.NOTION_FINANCE_CATEGORY_PROPERTY,
    ],
  },
  {
    name: 'calendar',
    id: env.NOTION_CALENDAR_DATA_SOURCE_ID,
    properties: [
      env.NOTION_CALENDAR_TITLE_PROPERTY,
      env.NOTION_CALENDAR_DATE_PROPERTY,
    ],
  },
  {
    name: 'links',
    id: env.NOTION_LINKS_DATA_SOURCE_ID,
    properties: [
      env.NOTION_LINK_TITLE_PROPERTY,
      env.NOTION_LINK_SUMMARY_PROPERTY,
      env.NOTION_LINK_URL_PROPERTY,
    ],
  },
];

// True when the fetched schema text mentions the property as a quoted name (plain or JSON-escaped).
// Notion MCP lists properties named "id"/"url" with a "userDefined:" prefix.
function hasProperty(schemaText, propertyName) {
  return [propertyName, `userDefined:${propertyName}`].some((name) => (
    schemaText.includes(`"${name}"`) || schemaText.includes(`\\"${name}\\"`)
  ));
}

const tools = await listNotionTools();
console.log(`Notion MCP tools (${tools.length}): ${tools.map((tool) => tool.name).join(', ')}\n`);

for (const tool of tools.filter((t) => SCHEMA_TOOLS.includes(t.name))) {
  console.log(`${tool.name} input schema:\n${JSON.stringify(tool.inputSchema, null, 2)}\n`);
}

let mismatches = 0;

for (const dataSource of DATA_SOURCES) {
  const fetched = await callNotionTool('notion-fetch', { id: `collection://${dataSource.id}` });
  const schemaText = typeof fetched === 'string' ? fetched : JSON.stringify(fetched);
  const missing = dataSource.properties.filter((property) => !hasProperty(schemaText, property));

  mismatches += missing.length;
  console.log(missing.length
    ? `✖ ${dataSource.name}: missing ${missing.map((p) => `"${p}"`).join(', ')}`
    : `✔ ${dataSource.name}: ${dataSource.properties.map((p) => `"${p}"`).join(', ')}`);

  if (process.argv.includes('--verbose')) {
    console.log(`${schemaText}\n`);
  }
}

if (process.argv.includes('--create-test')) {
  const task = await createTask({ title: 'Diagnostic task from notion-telebot', dueDate: null });
  console.log(`\nCreated diagnostic task: ${JSON.stringify(task)}`);
}

process.exitCode = mismatches ? 1 : 0;
