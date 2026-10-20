# 02: Log expenses through Notion MCP

**What to build:** An expense message sent to the bot ("spent $12 on lunch") creates a row in the Notion finance database through Notion MCP instead of the REST API. The Finance Agent's instructions and the `add_expense` tool contract (expense, positive amount, category from food/entertainment/gifts/transport/miscellaneous/work) do not change. Only the finance database module's backend moves onto the MCP client built in ticket 01.

**Blocked by:** 01: Connect to Notion MCP and create tasks through it

**Status:** done

- [x] `npm run test:agent -- spent $12 on lunch` creates a finance row with expense "lunch", amount 12 and category "food"
- [x] The finance module keeps its exported function name, its validation (empty expense, non-positive amount, unknown category) and its return shape (id, url, expense, amount, category)
- [x] The finance module no longer imports the Notion REST client
- [x] Tests cover the finance MCP payload mapping and each validation error, with no network calls
