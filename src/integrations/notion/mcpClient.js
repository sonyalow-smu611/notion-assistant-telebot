import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import { env } from '../../config/env.js';
import { createNotionMcpAuthProvider, NOTION_AUTH_EXPIRED_MESSAGE } from './mcpAuth.js';

// Opens a fresh connection to the hosted Notion MCP server.
// No connection is cached because Vercel functions are stateless.
async function connectNotionMcp() {
  const client = new Client({ name: 'notion-telebot', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(env.NOTION_MCP_URL), {
    authProvider: createNotionMcpAuthProvider(),
  });

  try {
    await client.connect(transport);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw new Error(NOTION_AUTH_EXPIRED_MESSAGE);
    }

    throw error;
  }

  return client;
}

// Joins the text parts of an MCP tool result.
function resultText(result) {
  return (result.content || [])
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n');
}

// Calls one Notion MCP tool and returns its parsed JSON result (or raw text when it is not JSON).
export async function callNotionTool(name, args) {
  const client = await connectNotionMcp();

  try {
    const result = await client.callTool({ name, arguments: args });
    const text = resultText(result);

    if (result.isError) {
      throw new Error(`Notion MCP ${name} failed: ${text}`);
    }

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } finally {
    await client.close();
  }
}

// Lists the tools the Notion MCP server exposes. Used by the diagnose script.
export async function listNotionTools() {
  const client = await connectNotionMcp();

  try {
    const { tools } = await client.listTools();
    return tools;
  } finally {
    await client.close();
  }
}
