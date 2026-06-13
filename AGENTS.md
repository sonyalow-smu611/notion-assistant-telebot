# Agent Instructions

## Project Purpose

This project is a Telegram-based general assistant agent hosted on Vercel.

The assistant uses:

- Telegram as the user interface.
- Vercel serverless functions for webhook hosting.
- OpenAI Agents SDK for agent orchestration, tools, handoffs, and tracing.
- Notion API for finance, calendar, and task databases.
- Supabase as the application database for memory, users, conversations, and agent run records.

Do not introduce MCP servers for Notion. Notion must be accessed directly through the Notion API.

## Architecture Rules

Keep the source layout organized around these folders:

```txt
src/
├── agents/
├── app/
├── config/
├── integrations/
├── memory/
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
-> Notion API / Supabase
-> Telegram reply
```

Keep `api/telegram.js` thin. It should validate the HTTP request, pass the update into app code, and return a response.

Do not put agent orchestration, Notion logic, Supabase logic, or Telegram reply formatting directly in the API route.

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
```

The triage agent is the entrypoint for assistant turns. It should route or hand off to the best specialist agent.

Responsibilities:

- `triageAgent`: classify the request and hand off to the correct specialist.
- `generalAgent`: normal assistant conversation and lightweight reasoning.
- `financeAgent`: expenses, finance tracking, and finance database actions.
- `calendarAgent`: scheduling and Notion calendar database actions.
- `taskManagerAgent`: task creation, task updates, planning, and task database actions.

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
memoryTools.js
```

Tools should expose safe, narrow actions to agents. They should not contain raw API client setup.

Expected mappings:

```txt
financeAgent
-> addExpenseTool()
-> src/integrations/notion/financeDatabase.js
-> Notion Finance Database API

calendarAgent
-> createCalendarEventTool()
-> src/integrations/notion/calendarDatabase.js
-> Notion Calendar Database API

taskManagerAgent
-> createTaskTool()
-> src/integrations/notion/taskDatabase.js
-> Notion Tasks Database API
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
│   ├── client.js
│   ├── financeDatabase.js
│   ├── calendarDatabase.js
│   └── taskDatabase.js
├── supabase/
│   ├── client.js
│   ├── conversations.js
│   ├── users.js
│   └── agentRuns.js
├── telegram/
│   ├── client.js
│   ├── parseUpdate.js
│   └── sendMessage.js
└── openai/
    ├── client.js
    └── runner.js
```

Integration modules should be boring and specific:

- Notion modules call Notion.
- Supabase modules call Supabase.
- Telegram modules parse updates and send messages.
- OpenAI integration code runs agents or centralizes OpenAI client setup.

Do not mix Telegram, Notion, Supabase, and agent behavior in the same integration module.

## Memory Rules

Keep memory behavior in:

```txt
src/memory/
```

Current memory files:

```txt
conversationMemory.js
userProfileMemory.js
summarizer.js
```

Supabase is the backing database for memory, but memory files define what memory means to the assistant.

Use this boundary:

```txt
src/memory/
-> assistant memory behavior

src/integrations/supabase/
-> Supabase table access
```

Agent code should call memory modules, not raw Supabase repositories, unless there is a clear reason.

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

Use Supabase for durable state.

If a Telegram request may exceed webhook timing expectations, respond quickly and move long work into an async queue or background workflow.

## Code Quality Rules

Prefer small modules with clear ownership.

Keep API routes thin.

Keep agents declarative where possible: instructions, tools, handoffs.

Keep tools narrow and validated.

Keep integrations free of agent-specific decision logic.

Keep memory separate from raw database access.

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
- Supabase memory persistence.
- Telegram update parsing.

Use mocks for Notion, Supabase, Telegram, and OpenAI in unit tests.
