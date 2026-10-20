import { env } from '../../config/env.js';
import { redis } from '../upstash/client.js';

// Redis keys that hold the Notion MCP OAuth state between serverless invocations.
const KEYS = {
  client: 'notion-mcp:client',
  tokens: 'notion-mcp:tokens',
  codeVerifier: 'notion-mcp:code-verifier',
};

// Shown in Telegram (via the assistant-turn catch) when the stored Notion connection is missing or revoked.
export const NOTION_AUTH_EXPIRED_MESSAGE = 'Notion connection expired — run npm run auth:notion';

// OAuth client provider for the hosted Notion MCP server.
// The MCP SDK calls these methods to load, refresh, and save credentials.
// `onRedirect` is only passed by the local auth script; at runtime a redirect means the user must re-authorize.
export function createNotionMcpAuthProvider({ onRedirect } = {}) {
  return {
    get redirectUrl() {
      return env.NOTION_MCP_REDIRECT_URI;
    },

    // Metadata sent once when the bot self-registers with Notion's OAuth server.
    get clientMetadata() {
      return {
        client_name: 'notion-telebot',
        redirect_uris: [env.NOTION_MCP_REDIRECT_URI],
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: 'none',
      };
    },

    async clientInformation() {
      return (await redis.get(KEYS.client)) ?? undefined;
    },

    async saveClientInformation(clientInformation) {
      await redis.set(KEYS.client, clientInformation);
    },

    async tokens() {
      return (await redis.get(KEYS.tokens)) ?? undefined;
    },

    // Persist every save: Notion may rotate the refresh token on each refresh.
    async saveTokens(tokens) {
      await redis.set(KEYS.tokens, tokens);
    },

    async redirectToAuthorization(authorizationUrl) {
      if (!onRedirect) {
        throw new Error(NOTION_AUTH_EXPIRED_MESSAGE);
      }

      await onRedirect(authorizationUrl);
    },

    async saveCodeVerifier(codeVerifier) {
      await redis.set(KEYS.codeVerifier, codeVerifier);
    },

    async codeVerifier() {
      return redis.get(KEYS.codeVerifier);
    },

    // Called by the SDK when Notion says stored credentials are no longer valid.
    async invalidateCredentials(scope) {
      if (scope === 'all' || scope === 'client') await redis.del(KEYS.client);
      if (scope === 'all' || scope === 'tokens') await redis.del(KEYS.tokens);
      if (scope === 'all' || scope === 'verifier') await redis.del(KEYS.codeVerifier);
    },
  };
}
