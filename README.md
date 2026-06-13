# Notion Telebot

A Telegram-based personal assistant hosted on Vercel. The bot receives Telegram messages, routes them through OpenAI Agents SDK specialists, and writes structured data to Notion and Supabase.

## What It Does

This assistant currently supports:

- General Telegram conversation
- Expense logging to a Notion finance database
- Calendar event creation in a Notion calendar database
- Task creation in a Notion tasks database
- Conversation persistence in Supabase
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
-> Notion API / Supabase
-> Telegram reply
```

The API route is intentionally thin. Agent orchestration, memory, integrations, and tool logic live under `src/`.

## Project Structure

```txt
api/
  telegram.js              # Vercel webhook endpoint
  notion.js                # Notion-related API endpoint

scripts/
  diagnoseTaskNotion.js    # Diagnose Notion task database setup
  setTelegramWebhook.js    # Register Telegram webhook URL
  testAgentTurn.js         # Local agent turn test script

src/
  agents/
    triageAgent.js
    generalAgent.js
    financeAgent.js
    calendarAgent.js
    taskManagerAgent.js

  app/
    handleTelegramUpdate.js
    runAssistantTurn.js

  config/
    env.js

  integrations/
    notion/
    openai/
    supabase/
    telegram/

  memory/
    conversationMemory.js

  tools/
    financeTools.js
    calendarTools.js
    taskTools.js
    memoryTools.js

  utils/
    tracing.js
```

## Agents

### Triage Agent

The entrypoint agent. It classifies each Telegram message and hands off to the right specialist.

Routes:

- Expense requests -> Finance Agent
- Calendar/event requests -> Calendar Agent
- Task/reminder requests -> Task Manager Agent
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
npm run test:agent
```

Diagnose the Notion tasks database:

```bash
npm run diagnose:tasks
```

## Deployment

This project is designed for Vercel serverless functions.

Deploy to Vercel, configure the environment variables in the Vercel dashboard, then register the Telegram webhook against the deployed `/api/telegram` endpoint.

Example:

```bash
npm run set:webhook -- https://your-vercel-domain.vercel.app/api/telegram
```

## Notes

- Notion is accessed directly through the Notion API.
- Supabase is used for durable memory and conversation records.
- The app assumes serverless stateless execution.
- Destructive or broad writes should require confirmation before implementation.
- The current `npm test` script is a placeholder and does not run automated tests yet.
