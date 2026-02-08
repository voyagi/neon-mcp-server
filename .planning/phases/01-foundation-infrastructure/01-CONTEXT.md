# Phase 1: Foundation & Infrastructure - Context

**Gathered:** 2026-02-08
**Status:** Ready for planning

<domain>

## Phase Boundary

MCP server foundation with proper logging, input validation, schema exposure, and Supabase connectivity. This phase delivers the invisible plumbing that all tool/resource phases build on. No business logic tools — just the infrastructure to support them.

</domain>

<decisions>

## Implementation Decisions

### Schema resource content

- Single `schema://tables` resource returns all tables in one call
- Full detail per table: column names, types, constraints (NOT NULL, CHECK), defaults, and foreign keys
- Explicitly show relationships (e.g., "tickets.customer_id references customers.id")
- Include human-readable descriptions for columns (e.g., "price_cents: Product price in cents, divide by 100 for dollars")
- Goal: Claude gets maximum database context so it writes correct queries without guessing

### Validation error style

- Helpful and specific error messages: "Invalid status 'pending'. Valid values: active, inactive, lead."
- Include the sent value in errors: "status: 'pending' is not valid. Expected: active, inactive, lead."
- Report all validation errors at once (not stop-at-first) so Claude can fix everything in one retry
- Zod default messages are fine for type mismatches — no custom type error messages needed

### Connection failure behavior

- Fail fast on connection errors — no retries, immediate clear error message
- Validate Supabase connection at server startup; fail immediately with setup instructions if unreachable
- Refuse to start if environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are missing
- Hide Supabase URL in error messages for security — say "check SUPABASE_URL" not the actual URL
- Wrap database errors (e.g., missing tables) with friendly messages pointing to seed/setup.md

### Logging granularity

- Default level: minimal (errors only) plus startup confirmation
- Not configurable via environment variable — keep setup simple
- No timestamps — Claude Desktop already timestamps its own logs
- Plain text format, not structured JSON

### Claude's Discretion

- Log message wording and formatting details
- Exact Zod schema structure for validation
- How to query Supabase information_schema for table metadata
- Startup sequence and initialization order

</decisions>

<specifics>

## Specific Ideas

- Error messages should guide prospects who skip setup steps — "Table 'customers' not found. Have you run the seed script? See seed/setup.md."
- Schema descriptions help Claude interpret domain-specific columns correctly (price_cents especially)
- The portfolio audience includes non-technical Upwork clients testing the demo themselves, so errors should be self-explanatory

</specifics>

<deferred>

## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-infrastructure*
*Context gathered: 2026-02-08*
