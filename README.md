# Notion Telebot

A Telegram-based personal assistant hosted on Vercel. The bot receives Telegram messages, routes them through OpenAI Agents SDK specialists, and writes structured data to Notion through the hosted Notion MCP server.

## What It Does

This assistant currently supports:

- General Telegram conversation
- Expense logging to a Notion finance database
- Calendar event creation in a Notion calendar database
- Task creation in a Notion tasks database
- URL summarization, with optional saving (title, summary, and URL) to a Notion links database
- OpenAI Agents SDK tracing

## Architecture

Request flow:

```txt
Telegram webhook
-> api/telegram.js
-> src/app/handleTelegramUpdate.js
-> src/app/runAssistantTurn.js
-> triageAgent
-> specialist agent handoff
-> tool
-> src/integrations/notion/*Database.js
-> Notion MCP (notion-create-pages)
-> Telegram reply
```

The API route is intentionally thin. Agent orchestration, integrations, and tool logic live under `src/`.

Agents only see narrow function tools (`create_task`, `add_expense`, `create_calendar_event`, `save_link_summary`). The database modules behind them call Notion MCP. Notion MCP uses OAuth; the bot's OAuth client and tokens are stored in Upstash Redis so stateless Vercel functions can reuse and refresh them.

## Project Structure

```txt
api/
  telegram.js              # Vercel webhook endpoint

scripts/
  authorizeNotionMcp.js    # One-time Notion MCP OAuth sign-in
  diagnoseNotionMcp.js     # Check Notion MCP tools and database columns
  setTelegramWebhook.js    # Register Telegram webhook URL
  testAgentTurn.js         # Local agent turn test script

test/                      # Unit tests (node --test), Notion MCP mocked

src/
  agents/
    triageAgent.js
    generalAgent.js
    financeAgent.js
    calendarAgent.js
    taskManagerAgent.js
    linkSummaryAgent.js
    linkCaptureAgent.js

  app/
    handleTelegramUpdate.js
    runAssistantTurn.js

  config/
    env.js

  integrations/
    notion/                # Notion MCP client, OAuth provider, database modules
    openai/
    telegram/
    upstash/               # Redis client for Notion MCP auth state
    web/

  tools/
    financeTools.js
    calendarTools.js
    taskTools.js
    linkSummaryTools.js
    linkTools.js
    memoryTools.js

  utils/
    tracing.js
    validateUrl.js
```

## Agents

### Triage Agent

The entrypoint agent. It classifies each Telegram message and hands off to the right specialist.

Routes:

- Expense requests -> Finance Agent
- Calendar/event requests -> Calendar Agent
- Task/reminder requests -> Task Manager Agent
- URL messages -> Link Summary Agent
- Normal conversation -> General Agent

### Finance Agent

Creates expense entries in Notion.

Supported categories:

```txt
food
entertainment
gifts
transport
miscellaneous
work
```

Example:

```txt
spent $12 on lunch
```

### Calendar Agent

Creates calendar events in Notion.

Supports simple date phrases such as:

```txt
today
tomorrow
this Saturday
next Friday
July 22
YYYY-MM-DD
```

Example:

```txt
dinner with Sam tomorrow
```

### Task Manager Agent

Creates tasks in Notion.

Supports due dates for:

```txt
today
tomorrow
YYYY-MM-DD
```

Example:

```txt
add a task to review my budget tomorrow
```

### Link Summary Agent

Summarizes each URL in a Telegram message. It always calls `summarize_url` before replying. If the user explicitly asks to save the result, it hands the title, completed summary, and original URL to the Link Capture Agent.

Supported v1 extraction:

```txt
Public webpages
Public GitHub repositories
Public metadata from social links when available
```

Example:

```txt
https://github.com/openai/openai-node
```

### Link Capture Agent

Saves the title, summary, and URL to the Notion links database (columns `Title`, `Summary`, `URL`). The full summary also goes in the page body. It does not fetch or summarize URLs itself.

### General Agent

Handles normal assistant conversation. It does not currently have tools.

## Installation

```bash
npm install
```

## Local Scripts

Set the Telegram webhook:

```bash
npm run set:webhook -- https://your-vercel-domain.vercel.app/api/telegram
```

Test an agent turn locally:

```bash
npm run test:agent -- spent $12 on lunch
```

Run unit tests:

```bash
npm test
```

Sign in to Notion MCP (one time, or again if the bot says the Notion connection expired):

```bash
npm run auth:notion
```

Check the Notion MCP connection and that each database has the configured columns (`--create-test` also creates a diagnostic task):

```bash
npm run diagnose:notion
```

## Deployment

This project is designed for Vercel serverless functions.

Setup:

1. Create an Upstash Redis database (for example through Vercel Storage), and put `KV_REST_API_URL` and `KV_REST_API_TOKEN` in `.env` and in Vercel.
2. Run `npm run auth:notion` locally and approve access to the workspace that holds your databases.
3. Run `npm run diagnose:notion` and fix any reported column-name mismatches with `NOTION_*_PROPERTY` overrides.
4. Deploy to Vercel, configure the environment variables in the Vercel dashboard, then register the Telegram webhook against the deployed `/api/telegram` endpoint.

Required environment variables:

```txt
TELEGRAM_BOT_TOKEN
OPENAI_API_KEY
NOTION_TASKS_DATA_SOURCE_ID
NOTION_FINANCE_DATA_SOURCE_ID
NOTION_CALENDAR_DATA_SOURCE_ID
NOTION_LINKS_DATA_SOURCE_ID
KV_REST_API_URL
KV_REST_API_TOKEN
```

Example:

```bash
npm run set:webhook -- https://your-vercel-domain.vercel.app/api/telegram
```

## Notes

- Notion is accessed through the hosted Notion MCP server (`https://mcp.notion.com/mcp`), not the Notion REST API.
- The app assumes serverless stateless execution. Each Notion write opens a fresh MCP connection.
- Each Telegram update is processed independently; there is no conversation persistence or duplicate webhook deduplication.
- Destructive or broad writes should require confirmation before implementation.
- `npm test` covers the Notion database mappings and link tool validation with Notion MCP mocked.
