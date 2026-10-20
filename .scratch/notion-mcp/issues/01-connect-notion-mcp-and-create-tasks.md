# 01: Connect to Notion MCP and create tasks through it

**What to build:** The bot can authenticate with Notion's hosted MCP server (`https://mcp.notion.com/mcp`), and a task request sent to the bot ("add a task to call Alex tomorrow") creates a row in the Notion tasks database through MCP instead of the REST API. The Task Manager Agent's instructions and the `create_task` tool contract (schema, today/tomorrow/YYYY-MM-DD due-date resolution, return shape) do not change. Only the tasks database module's backend changes.

This ticket proves the risky part, OAuth plus MCP transport, end-to-end with one real write. The finance, calendar and links modules keep using the REST client until their own tickets, so `NOTION_API_KEY` stays required for now.

Decisions already made (see the plan file):
- **OAuth client:** self-register through `https://mcp.notion.com/register`. Do not use a Notion public integration. The server's metadata, checked on 2026-10-20, advertises dynamic client registration, PKCE S256 and refresh tokens, and it rejects `ntn_` integration tokens with 401.
- **Storage:** client details and tokens are stored in Upstash Redis under `notion-mcp:*` keys. Every token save is persisted, because refresh tokens may rotate.
- **Runtime:** if tokens are missing or revoked, the bot throws "Notion connection expired — run npm run auth:notion". The existing assistant-turn catch replies with that message in Telegram.
- **Connections:** one MCP connection per call (connect, call, close). No in-memory session state, so it stays compatible with stateless Vercel.
- **Properties:** use the fixed property names from env config. No per-write schema lookup.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] The existing uncommitted Supabase-removal changes are committed on `main` as their own commit (ask the user first), then branch `notion-mcp` is created
- [x] Dependencies: the MCP SDK and the Upstash Redis client are added. `@notionhq/client` stays for now
- [x] `KV_REST_API_URL` and `KV_REST_API_TOKEN` are required by env config, and `NOTION_MCP_URL` and `NOTION_MCP_REDIRECT_URI` have defaults. `.env.example` is updated
- [x] `npm run auth:notion` completes the browser consent flow locally (self-registration on first run, then PKCE) and stores the client details and tokens in Redis
- [x] `npm run diagnose:notion` does all of the following:
  - lists the MCP tools and prints the page-creation tool's input schema;
  - fetches all four data sources and reports any configured `NOTION_*_PROPERTY` name missing from the real schema;
  - with `--create-test`, creates a diagnostic task.
- [x] Every property-name mismatch the diagnose script reports is fixed with an env override, or raised with the user
- [x] `npm run test:agent -- add a task to call Alex tomorrow` creates a task in Notion with the correct title, default category, unchecked status and tomorrow's date (Asia/Singapore)
- [x] The task module's exported function name and return shape (id, url, title, category, dueDate, status) are unchanged
- [x] `npm test` runs `node --test`, with tests for the task MCP payload mapping and for the empty-title validation error, and with no network calls
- [x] With the Redis tokens deleted, a task request returns the "Notion connection expired" message rather than crashing
