// Environment loading and validation
import 'dotenv/config';

const requiredEnv = [
  'TELEGRAM_BOT_TOKEN',
  'OPENAI_API_KEY',
  'NOTION_API_KEY',
  'NOTION_TASKS_DATA_SOURCE_ID',
  'NOTION_FINANCE_DATA_SOURCE_ID',
  'NOTION_CALENDAR_DATA_SOURCE_ID',
  'NOTION_LINKS_DATA_SOURCE_ID',
  'KV_REST_API_URL',
  'KV_REST_API_TOKEN',
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  NOTION_API_KEY: process.env.NOTION_API_KEY,
  // Hosted Notion MCP server and the local OAuth callback used by `npm run auth:notion`.
  NOTION_MCP_URL: process.env.NOTION_MCP_URL || 'https://mcp.notion.com/mcp',
  NOTION_MCP_REDIRECT_URI: process.env.NOTION_MCP_REDIRECT_URI || 'http://localhost:3999/callback',
  // Upstash Redis (Vercel Marketplace names) stores the Notion MCP OAuth client and tokens.
  KV_REST_API_URL: process.env.KV_REST_API_URL,
  KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
  NOTION_TASKS_DATA_SOURCE_ID: process.env.NOTION_TASKS_DATA_SOURCE_ID,
  NOTION_FINANCE_DATA_SOURCE_ID: process.env.NOTION_FINANCE_DATA_SOURCE_ID,
  NOTION_CALENDAR_DATA_SOURCE_ID: process.env.NOTION_CALENDAR_DATA_SOURCE_ID,
  NOTION_LINKS_DATA_SOURCE_ID: process.env.NOTION_LINKS_DATA_SOURCE_ID,
  NOTION_TASK_TITLE_PROPERTY: process.env.NOTION_TASK_TITLE_PROPERTY || 'Task',
  NOTION_TASK_CATEGORY_PROPERTY: process.env.NOTION_TASK_CATEGORY_PROPERTY || 'Category',
  NOTION_TASK_DEFAULT_CATEGORY: process.env.NOTION_TASK_DEFAULT_CATEGORY || 'general',
  NOTION_TASK_STATUS_PROPERTY: process.env.NOTION_TASK_STATUS_PROPERTY || 'Status',
  NOTION_TASK_DUE_PROPERTY: process.env.NOTION_TASK_DUE_PROPERTY || 'Due Date',
  NOTION_FINANCE_EXPENSE_PROPERTY: process.env.NOTION_FINANCE_EXPENSE_PROPERTY || 'expense',
  NOTION_FINANCE_AMOUNT_PROPERTY: process.env.NOTION_FINANCE_AMOUNT_PROPERTY || 'amount',
  NOTION_FINANCE_CATEGORY_PROPERTY: process.env.NOTION_FINANCE_CATEGORY_PROPERTY || 'category',
  NOTION_CALENDAR_TITLE_PROPERTY: process.env.NOTION_CALENDAR_TITLE_PROPERTY || 'Event',
  NOTION_CALENDAR_DATE_PROPERTY: process.env.NOTION_CALENDAR_DATE_PROPERTY || 'Date',
  NOTION_LINK_TITLE_PROPERTY: process.env.NOTION_LINK_TITLE_PROPERTY || 'Title',
  NOTION_LINK_URL_PROPERTY: process.env.NOTION_LINK_URL_PROPERTY || 'URL',
  NOTION_LINK_SUMMARY_PROPERTY: process.env.NOTION_LINK_SUMMARY_PROPERTY || 'Summary',
};
