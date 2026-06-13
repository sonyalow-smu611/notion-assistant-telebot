import { Client } from '@notionhq/client';
import { env } from '../../config/env.js';

// Central Notion client setup.
// Database-specific modules should import this instead of creating their own clients.
export const notion = new Client({
  auth: env.NOTION_API_KEY,
  notionVersion: '2026-03-11',
});