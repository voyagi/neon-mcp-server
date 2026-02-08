# Phase 2: Read Operations - Context

**Gathered:** 2026-02-08
**Status:** Ready for planning

<domain>

## Phase Boundary

MCP tools that let Claude query all business entities (customers, tickets, products) with natural filtering. Users interact via conversation; Claude calls the tools. No write operations — those are Phase 3.

</domain>

<decisions>

## Implementation Decisions

### Response shape

- Return all fields for every entity in list and detail views — no abbreviated summaries
- Always include a result count in list responses (e.g., `count: 12`)
- Prices: return both `price_cents` (raw integer) and `price_display` (formatted "$49.99")
- Timestamps: return raw ISO 8601 strings — Claude formats naturally for the user
- Empty results: return `{ results: [], count: 0, message: "No customers match..." }` with a contextual message
- No filter echo in responses — Claude already knows what it sent

### Filter design

- Company name filtering uses partial, case-insensitive matching ("Acme" matches "Acme Corp")
- All filters on a tool are AND-combinable (e.g., `list_tickets(status='open', priority='high')`)
- Product search queries across all text fields: name, category, and description
- `list_tickets` accepts `customer_name` OR `customer_id` — server resolves name to ID internally

### Result limits

- No default limit — return all matching results (demo data is small: ~20 customers, ~30 tickets)
- Each tool has a fixed, sensible sort order (tickets by created_at desc, customers by name, products by name)
- No user-controlled sorting parameter

### Linked data depth

- `get_ticket`: include key customer fields inline (name, email, company) — enough context without a second call
- `list_tickets`: include `customer_name` only per ticket — lighter response
- `get_customer`: include `open_tickets_count`, `total_tickets_count`, and last 3 recent ticket subjects
- No other cross-entity joins in list views

### Claude's Discretion

- Exact wording of empty-result messages
- Sort direction choices per entity (asc vs desc)
- Whether to log filter resolution (customer_name → customer_id) to stderr

</decisions>

<specifics>

## Specific Ideas

- Ticket list with customer name feels like a real CRM — prospects should see this as production-quality
- The "get customer with recent tickets" pattern mirrors what a support agent would actually need
- Price having both raw and display values shows attention to both programmatic and human use cases

</specifics>

<deferred>

## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-read-operations*
*Context gathered: 2026-02-08*
