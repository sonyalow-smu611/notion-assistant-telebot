# 04: Save link summaries (with their URL) through Notion MCP

**What to build:** When the user asks the bot to save a link ("save this https://github.com/openai/openai-node"), the summarize-then-hand-off flow saves a row to the Notion links database through Notion MCP instead of the REST API. The row has exactly three columns:

- **Title** (title): a short title for the content.
- **Summary** (text): the summary, capped at 2,000 characters.
- **URL** (url): the original link.

The full summary also goes in the page body as markdown content, replacing the REST version's manual 2,000-character paragraph chunking. The `Date Saved` and `Status` columns are no longer written.

**This deliberately changes the link agents and tool, at the user's request (2026-10-20).** Previously URLs were never stored. Now:
- The Link Summary Agent hands off the title, the completed summary and the original URL.
- The Link Capture Agent passes the URL to the tool. Its "never pass or store a URL" rules are replaced with "save the URL that was summarized".
- The `save_link_summary` tool accepts a required `url`, validated as http/https like `summarize_url` does, plus the title and summary. It drops the optional `status` argument, because there is no Status column any more.
- All other link-agent behaviour stays: plain URL messages still only get a summary reply, and nothing is saved unless the user asks.

**Blocked by:** 01: Connect to Notion MCP and create tasks through it

**Status:** ready-for-agent

- [ ] `npm run test:agent -- save this https://github.com/openai/openai-node` creates one links row with Title, Summary and URL (the exact link) filled in, and the full summary as the page body
- [ ] A plain URL message with no save request still only replies with a summary and writes nothing to Notion
- [ ] `save_link_summary` rejects a missing or non-http(s) URL, an empty title and an empty summary
- [ ] The Link Summary and Link Capture Agent instructions describe passing and saving the URL. No leftover instruction says URLs must not be stored
- [ ] Env config keeps the link title, summary and URL property names (default `Title`, `Summary`, `URL`) and drops the unused link source-type, domain, date-saved and status property entries
- [ ] The links module no longer imports the Notion REST client
- [ ] Tests cover the links MCP payload mapping (including the URL property), the summary cap and the validation errors, with no network calls
