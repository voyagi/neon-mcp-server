# Requirements: TechStart CRM MCP Server

**Defined:** 2026-02-08
**Core Value:** Prospects who see this project should immediately think "he can build this for me"

## v1 Requirements

Requirements for portfolio launch. Each maps to roadmap phases.

### Infrastructure

- [x] **INFR-01**: MCP server exposes database schema as resource at `schema://tables` listing all tables and columns
- [x] **INFR-02**: All tool inputs validated with Zod schemas; invalid inputs return helpful error messages explaining what's wrong and how to fix it
- [x] **INFR-03**: All logging uses stderr only; no stdout writes that could corrupt the MCP JSON-RPC protocol stream

### Customers

- [x] **CUST-01**: `list_customers` tool returns all customers with optional filters by status (active/inactive/lead) and company name
- [x] **CUST-02**: `get_customer` tool returns a single customer by UUID with all fields
- [x] **CUST-03**: `create_customer` tool adds a new customer with name, email, company, and status; returns created record
- [x] **CUST-04**: `update_customer` tool modifies customer fields by UUID; returns updated record

### Tickets

- [x] **TICK-01**: `list_tickets` tool returns tickets with optional filters by status (open/in_progress/closed), customer ID, and priority
- [x] **TICK-02**: `get_ticket` tool returns ticket details including linked customer info via JOIN (not just customer_id)
- [x] **TICK-03**: `create_ticket` tool creates a support ticket linked to existing customer by UUID; validates customer exists
- [x] **TICK-04**: `close_ticket` tool marks ticket as resolved with closed_at timestamp; validates ticket is not already closed

### Products

- [x] **PROD-01**: `list_products` tool returns all products with name, category, price, and description
- [x] **PROD-02**: `search_products` tool finds products by name or category using case-insensitive matching

### Analytics

- [x] **ANLT-01**: `get_summary` tool returns composite dashboard stats: total customers by status, open vs closed ticket counts, total product catalog value

### Seed Data

- [ ] **SEED-01**: Seed SQL contains ~20 customers (diverse companies, mixed statuses), ~30 tickets (varied subjects, priorities, open/closed mix with timestamps), ~10 products (realistic names, categories, pricing)
- [ ] **SEED-02**: Setup guide documents how to create Supabase project, create tables, and run seed SQL

### Polish

- [ ] **PLSH-01**: README includes project overview, feature list, screen-recorded demo path, and self-serve setup guide for prospects
- [ ] **PLSH-02**: Claude Desktop integration config example with copy-paste JSON for `claude_desktop_config.json`
- [ ] **PLSH-03**: Demo conversation script/outline covering tool variety: list, filter, create, close, search, analytics, schema

## v2 Requirements

Deferred to post-portfolio. Add if Upwork prospects request them.

- **PAGE-01**: Pagination for list operations with row count estimation and offset parameter
- **SRCH-01**: Cross-entity search (e.g., find tickets from specific company customers)
- **BULK-01**: Bulk operations (e.g., close_multiple_tickets) showing composite tool patterns
- **AUDT-01**: Audit logging for who/what/when tracking

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Authentication/multi-user | Demo uses single service role key; not multi-tenant production software |
| Real-time notifications (`tools/list_changed`) | Adds complexity, invalidates Claude Desktop cache, no demo value |
| DELETE operations | Destructive in demos; use status changes (close, archive) instead |
| HTTP/SSE transport | Stdio sufficient for Claude Desktop integration; simpler setup for prospects |
| Frontend/UI | Claude IS the interface — that's the whole point of MCP |
| Raw SQL execution tool | Intent-focused tools only; raw SQL is an anti-pattern for MCP demos |
| Fuzzy/full-text search | Postgres ILIKE sufficient at demo scale; over-engineering |
| Test framework | Portfolio demo — time better spent on polish and demo quality |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFR-01 | Phase 1 | Complete |
| INFR-02 | Phase 1 | Complete |
| INFR-03 | Phase 1 | Complete |
| CUST-01 | Phase 2 | Complete |
| CUST-02 | Phase 2 | Complete |
| CUST-03 | Phase 3 | Complete |
| CUST-04 | Phase 3 | Complete |
| TICK-01 | Phase 2 | Complete |
| TICK-02 | Phase 2 | Complete |
| TICK-03 | Phase 3 | Complete |
| TICK-04 | Phase 3 | Complete |
| PROD-01 | Phase 2 | Complete |
| PROD-02 | Phase 2 | Complete |
| ANLT-01 | Phase 3 | Complete |
| SEED-01 | Phase 4 | Pending |
| SEED-02 | Phase 4 | Pending |
| PLSH-01 | Phase 4 | Pending |
| PLSH-02 | Phase 4 | Pending |
| PLSH-03 | Phase 4 | Pending |

**Coverage:**

- v1 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0

---
*Requirements defined: 2026-02-08*
*Last updated: 2026-02-08 after Phase 3 execution complete*
