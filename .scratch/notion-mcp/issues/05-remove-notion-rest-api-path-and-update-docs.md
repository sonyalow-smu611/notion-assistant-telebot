# 05: Remove the Notion REST API path and update the docs

**What to build:** Now that every Notion write goes through MCP, remove the REST API path completely and make the project docs describe the MCP architecture. The bot's behaviour does not change.

This includes deleting the Notion webhook receiver route, which only logged events.

**Blocked by:**
- 02: Log expenses through Notion MCP
- 03: Create calendar events through Notion MCP
- 04: Save link summaries through Notion MCP

**Status:** done

- [x] The Notion REST client module, the `@notionhq/client` dependency, the old task-only diagnostic script and its npm script are removed
- [x] The Notion webhook route is deleted, and `NOTION_WEBHOOK_VERIFICATION_TOKEN` is removed from `.env.example`
- [x] `NOTION_API_KEY` is no longer required by env config or listed in `.env.example`
- [x] AGENTS.md changes:
  - It no longer says "Do not introduce MCP servers for Notion". It now says Notion is accessed through the hosted Notion MCP server, that agents use narrow function tools, and that raw Notion MCP tools must not be exposed to agents.
  - The request flow and the integrations tree reflect MCP and the Upstash token store.
- [x] The README's flow, project structure, setup steps (Upstash plus `npm run auth:notion`), env vars and notes reflect MCP
- [x] The Notion setup lines in the personal notes doc that would now be wrong are updated
- [x] A recursive grep for `@notionhq/client`, `NOTION_API_KEY` and `api/notion`, excluding node_modules, returns nothing
- [x] `npm test` passes, and `test:agent` still works for task, expense, calendar, link-save and "hello"
