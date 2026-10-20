import 'dotenv/config';
import http from 'node:http';
import { exec } from 'node:child_process';
import { auth } from '@modelcontextprotocol/sdk/client/auth.js';
import { env } from '../src/config/env.js';
import { createNotionMcpAuthProvider } from '../src/integrations/notion/mcpAuth.js';

// One-time local OAuth flow for the hosted Notion MCP server.
// It self-registers the bot, opens Notion's consent page, and stores the client and tokens in Redis.
// Re-run only if the bot reports that the Notion connection expired.
const redirectUrl = new URL(env.NOTION_MCP_REDIRECT_URI);

// Starts a temporary localhost server that waits for Notion to redirect back with the authorization code.
function startCallbackServer() {
  let server;

  const code = new Promise((resolve, reject) => {
    server = http.createServer((req, res) => {
      const url = new URL(req.url, redirectUrl);

      if (url.pathname !== redirectUrl.pathname) {
        res.writeHead(404).end();
        return;
      }

      const authorizationCode = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      res.end(authorizationCode
        ? 'Notion connected. You can close this tab.'
        : `Notion authorization failed: ${error}`);

      if (authorizationCode) {
        resolve(authorizationCode);
      } else {
        reject(new Error(`Notion authorization failed: ${error}`));
      }
    });

    server.listen(Number(redirectUrl.port), redirectUrl.hostname);
  });

  return { code, close: () => server.close() };
}

// Prints the consent URL and opens it in the default browser on macOS.
function openInBrowser(authorizationUrl) {
  console.log(`Open this URL to connect Notion:\n${authorizationUrl.href}\n`);

  if (process.platform === 'darwin') {
    exec(`open "${authorizationUrl.href}"`);
  }
}

const callback = startCallbackServer();
const provider = createNotionMcpAuthProvider({ onRedirect: openInBrowser });

try {
  const result = await auth(provider, { serverUrl: env.NOTION_MCP_URL });

  if (result === 'AUTHORIZED') {
    console.log('Notion MCP is already authorized. Stored tokens are valid.');
  } else {
    const authorizationCode = await callback.code;
    await auth(provider, { serverUrl: env.NOTION_MCP_URL, authorizationCode });
    console.log('Notion MCP authorized. Client and tokens saved to Redis.');
  }
} finally {
  callback.close();
}
