# Agent Instructions

## Project Purpose

This project is a Telegram-based general assistant agent hosted on Vercel.

The assistant uses:

- Telegram as the user interface.
- Vercel serverless functions for webhook hosting.
- OpenAI Agents SDK for agent orchestration, tools, handoffs, and tracing.
- Notion MCP (the hosted server at `https://mcp.notion.com/mcp`) for finance, calendar, task, and links databases.
- Upstash Redis for the Notion MCP OAuth client and tokens, recent chat history, and handled Telegram update IDs.

Notion is accessed through the hosted Notion MCP server via `src/integrations/notion/mcpClient.js`. Do not use the Notion REST API or `@notionhq/client`.

Agents use narrow function tools. Do not expose raw Notion MCP tools to agents; database modules call Notion MCP tools on the tools' behalf.

## Architecture Rules

Keep the source layout organized around these folders:

```txt
src/
├── agents/
├── app/
├── config/
├── integrations/
├── tools/
└── utils/
```

Do not add an `observability/` folder unless logging, metrics, or tracing code becomes large enough to justify it.

Use OpenAI Agents SDK tracing with `withTrace`. Small tracing helpers belong in:

```txt
src/utils/tracing.js
```

## Request Flow

The expected flow is:

```txt
Telegram webhook
-> api/telegram.js
-> src/app/handleTelegramUpdate.js
-> src/app/runAssistantTurn.js
-> triageAgent
-> specialist agent handoff
-> tool
-> src/integrations/notion/*Database.js
-> Notion MCP
-> Telegram reply
```

Keep `api/telegram.js` thin. It should validate the HTTP request, pass the update into app code, and return a response.

Do not put agent orchestration, Notion logic, or Telegram reply formatting directly in the API route.

## Agent Rules

The agent layer lives in:

```txt
src/agents/
```

Use these agents:

```txt
triageAgent.js
generalAgent.js
financeAgent.js
calendarAgent.js
taskManagerAgent.js
linkSummaryAgent.js
linkCaptureAgent.js
```

The triage agent is the entrypoint for assistant turns. It should route or hand off to the best specialist agent.

Responsibilities:

- `triageAgent`: classify the request and hand off to the correct specialist.
- `generalAgent`: normal assistant conversation and lightweight reasoning.
- `financeAgent`: expenses, finance tracking, and finance database actions.
- `calendarAgent`: scheduling and Notion calendar database actions.
- `taskManagerAgent`: task creation, task updates, planning, and task database actions.
- `linkSummaryAgent`: summarizes URLs and hands save requests to `linkCaptureAgent`.
- `linkCaptureAgent`: saves a completed link summary and its URL to the Notion links database.

## Tool Rules

Agent-callable tools live in:

```txt
src/tools/
```

Current tool files:

```txt
financeTools.js
calendarTools.js
taskTools.js
linkSummaryTools.js
linkTools.js
```

Tools should expose safe, narrow actions to agents. They should not contain raw API client setup.

Expected mappings:

```txt
financeAgent
-> addExpenseTool()
-> src/integrations/notion/financeDatabase.js
-> Notion MCP notion-create-pages (finance data source)

calendarAgent
-> createCalendarEventTool()
-> src/integrations/notion/calendarDatabase.js
-> Notion MCP notion-create-pages (calendar data source)

taskManagerAgent
-> createTaskTool()
-> src/integrations/notion/taskDatabase.js
-> Notion MCP notion-create-pages (tasks data source)

linkCaptureAgent
-> saveLinkSummaryTool()
-> src/integrations/notion/linkDatabase.js
-> Notion MCP notion-create-pages (links data source)
```

Ask for confirmation before destructive, broad, or ambiguous writes.

Examples:

- Deleting Notion records.
- Updating many records at once.
- Creating entries with ambiguous dates, times, amounts, currencies, or database targets.

## Integration Rules

Low-level external service code lives in:

```txt
src/integrations/
```

Use this structure:

```txt
src/integrations/
├── notion/
│   ├── mcpClient.js
│   ├── mcpAuth.js
│   ├── financeDatabase.js
│   ├── calendarDatabase.js
│   ├── taskDatabase.js
│   └── linkDatabase.js
├── upstash/
│   └── client.js
├── telegram/
│   ├── client.js
│   ├── parseUpdate.js
│   └── sendMessage.js
├── openai/
│   ├── client.js
│   ├── runner.js
│   └── linkSummarizer.js
└── web/
    └── linkExtractor.js
```

Integration modules should be boring and specific:

- Notion modules call Notion MCP.
- The Upstash module only provides the shared Redis client.
- Telegram modules parse updates and send messages.
- OpenAI integration code runs agents or centralizes OpenAI client setup.

Do not mix Telegram, Notion, and agent behavior in the same integration module.

## Config Rules

Environment loading and validation belong in:

```txt
src/config/env.js
```

Do not scatter direct `process.env` reads throughout the codebase. Use the exported `env` object.

Keep `.env.example` updated whenever required environment variables change.

## Vercel Rules

The backend must remain compatible with Vercel serverless functions.

Assume functions are stateless. Do not rely on in-memory sessions for user state, conversation history, queues, or durable logs.

Open a fresh Notion MCP connection per call. Durable Notion MCP auth state lives in Upstash Redis; re-authorize with `npm run auth:notion`.

If a Telegram request may exceed webhook timing expectations, respond quickly and move long work into an async queue or background workflow.

## Code Quality Rules

Prefer small modules with clear ownership.

Keep API routes thin.

Keep agents declarative where possible: instructions, tools, handoffs.

Keep tools narrow and validated.

Keep integrations free of agent-specific decision logic.

Do not add abstractions unless they clarify a real boundary or reduce real duplication.

## Working Behavior Rules

Use the guidance from `rules.md` as the default working behavior for coding tasks.

Think before coding:

- State assumptions explicitly when they matter.
- If multiple interpretations exist, present them instead of choosing silently.
- If a simpler approach exists, mention it.
- If something is unclear enough to risk the wrong change, stop and ask.

Favor simplicity:

- Write the minimum code that solves the requested problem.
- Do not add speculative features, single-use abstractions, or unrequested configurability.
- Do not add error handling for impossible scenarios.
- If an implementation is much larger than the problem calls for, simplify it.

Make surgical changes:

- Touch only the files and lines needed for the request.
- Do not refactor, reformat, or improve adjacent code unless required.
- Match existing style, even when a different style might be preferable.
- Mention unrelated dead code or issues instead of deleting them.
- Remove only imports, variables, functions, or files made unused by your own change.

Work toward verifiable goals:

- Define success criteria for non-trivial work.
- For bugs, prefer a reproducing test or command before the fix when practical.
- For validation changes, verify invalid and valid paths when practical.
- For refactors, verify behavior before and after when practical.
- For multi-step tasks, share a brief plan with checks.

## Testing Guidance

When adding behavior, prefer focused tests around:

- Agent routing decisions.
- Tool input validation.
- Notion database mapping.
- Telegram update parsing.

Use mocks for Notion MCP, Redis, Telegram, and OpenAI in unit tests. Tests run with `npm test` (`node --test` with module mocks).
