# 06: Cut production over to Notion MCP

**What to build:** The production Telegram bot on Vercel writes to Notion through MCP. Until the merge, production keeps running the REST version from `main`. Rollback is a `git revert` of the merge.

**Blocked by:** 05: Remove the Notion REST API path and update the docs

**Status:** ready-for-agent

- [ ] Before merging, the user has added `KV_REST_API_URL` and `KV_REST_API_TOKEN` to Vercel (Production and Preview), plus any `NOTION_*_PROPERTY` overrides found in ticket 01
- [ ] `notion-mcp` is merged to `main` (ask the user first) and the Vercel production deploy succeeds
- [ ] From real Telegram, these four messages each produce the right reply and the right Notion row:
  - a task request;
  - an expense;
  - a calendar event;
  - a link-save.
- [ ] A plain "hello" gets a general-agent reply
- [ ] Telegram reply latency is acceptable within the 60s function limit (note the observed times)
- [ ] After confirmation, the user removes `NOTION_API_KEY` and `NOTION_WEBHOOK_VERIFICATION_TOKEN` from Vercel and optionally revokes the old Notion integration token
- [ ] Token refresh is confirmed once the access token has expired: a message still works and Redis holds updated tokens
