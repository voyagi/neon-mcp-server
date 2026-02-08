# Phase 3: Write Operations & Analytics - Context

**Gathered:** 2026-02-08
**Status:** Ready for planning

<domain>

## Phase Boundary

Claude can modify business data (create/update customers, create/close tickets) and provide dashboard insights (composite stats across all entities). Read operations are already complete in Phase 2. Seed data and portfolio polish are Phase 4.

</domain>

<decisions>

## Implementation Decisions

### Write confirmation & response shape

- Return **full created/updated record** including generated fields (id, created_at)
- Updates return **current state only** — no before/after diff
- **Data only** in tool responses — no human-friendly confirmation messages; Claude will narrate naturally
- `create_customer` requires **name + email**; company and status are optional

### Validation & error messaging

- Duplicate email on `create_customer` returns a **clear error message** (e.g. "A customer with email X already exists")
- `create_ticket` accepts **both customer name and customer_id** — follows Phase 2 name resolution pattern
- If customer name resolves to multiple matches, return **error with list of matches** so user can specify
- `update_customer` supports **partial updates** — only send fields you want to change

### Close ticket behavior

- Re-closing an already-closed ticket returns a **friendly error** with the original close date
- `close_ticket` accepts **ticket ID only** — no subject/name lookup for this destructive-ish action
- Closing accepts an **optional resolution note** stored in a new `resolution` text column (schema addition required)
- Closing sets `status='closed'` and `closed_at=now()`

### Dashboard summary content

- Include the three core stats: customer counts by status, ticket open/closed split, total product catalog value
- **Add recent activity**: customers created this week, tickets closed this week
- Product value includes **total + breakdown by category**
- **Formatted currency** (e.g. "$29.99") — consistent with Phase 2 read tools price_display pattern
- Ticket stats include **priority breakdown** (count per priority level) alongside open/closed counts

### Claude's Discretion

- Exact error message wording for validation failures
- Whether to batch multiple Supabase queries or use RPC for the summary
- Response field ordering and any computed field naming
- How to handle the schema migration for the resolution column (inline SQL vs seed file)

</decisions>

<specifics>

## Specific Ideas

- Name resolution on create_ticket should follow the same two-step query pattern established in Phase 2 (resolve name → filter)
- The resolution column is new — needs ALTER TABLE or updated seed SQL
- Dashboard should feel like a quick "how's the business doing?" snapshot, not a detailed report

</specifics>

<deferred>

## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-write-operations-analytics*
*Context gathered: 2026-02-08*
