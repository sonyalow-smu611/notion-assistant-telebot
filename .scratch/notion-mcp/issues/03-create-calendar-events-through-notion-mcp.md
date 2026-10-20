# 03: Create calendar events through Notion MCP

**What to build:** A calendar message sent to the bot ("dinner with Sam this saturday") creates a row in the Notion calendar database through Notion MCP instead of the REST API. The Calendar Agent's instructions and the `create_calendar_event` tool contract (title plus date, with today, tomorrow, this/next weekday, Month Day and YYYY-MM-DD resolved in Asia/Singapore) do not change. Only the calendar database module's backend moves onto the MCP client built in ticket 01.

**Blocked by:** 01: Connect to Notion MCP and create tasks through it

**Status:** done

- [x] `npm run test:agent -- dinner with Sam this saturday` creates a calendar row with the correct title and the upcoming Saturday's date
- [x] The calendar module keeps its exported function name, its validation (empty title, non-YYYY-MM-DD date) and its return shape (id, url, title, date)
- [x] The calendar module no longer imports the Notion REST client
- [x] Tests cover the calendar MCP payload mapping and both validation errors, with no network calls
