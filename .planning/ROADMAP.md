# Roadmap: TechStart CRM MCP Server

## Overview

Transform a scaffolded MCP server project into a portfolio-ready demonstration of database integration with Claude. Build from foundation (logging, validation, schema exposure) through core CRUD operations (read first, write second) to polished deliverables (seed data, setup guides, demo script). Every phase delivers verifiable capabilities that work together to prove "he can build this for me" to Upwork prospects.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3, 4): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Infrastructure** - Logging, validation patterns, schema resource
- [x] **Phase 2: Read Operations** - Customer, ticket, product list/get tools with filtering
- [x] **Phase 3: Write Operations & Analytics** - Create/update/close tools plus dashboard summary
- [ ] **Phase 4: Seed Data & Portfolio Polish** - Realistic demo data, setup guides, integration config

## Phase Details

### Phase 1: Foundation & Infrastructure

**Goal**: MCP server foundation works correctly with proper logging, validation, and schema exposure
**Depends on**: Nothing (first phase)
**Requirements**: INFR-01, INFR-02, INFR-03
**Success Criteria** (what must be TRUE):

  1. Claude can introspect database schema via `schema://tables` resource showing all tables and columns
  2. Tools with invalid inputs return helpful error messages explaining exactly what's wrong and how to fix it
  3. Server logs diagnostic information to stderr without corrupting the MCP protocol stream on stdout
  4. Supabase client connects successfully and queries execute without connection pool issues

**Plans**: 3 plans

Plans:

- [x] 01-01-PLAN.md -- Supabase client hardening (env validation, connection test, stderr logging audit)
- [x] 01-02-PLAN.md -- Zod validation schemas for all tool inputs + error formatter
- [x] 01-03-PLAN.md -- Schema resource (schema://tables) with full table metadata

### Phase 2: Read Operations

**Goal**: Claude can query all business entities with natural filtering
**Depends on**: Phase 1
**Requirements**: CUST-01, CUST-02, TICK-01, TICK-02, PROD-01, PROD-02
**Success Criteria** (what must be TRUE):

  1. User can ask "show me all customers" and receive complete customer list with all fields
  2. User can filter customers by status (active/inactive/lead) or company name through natural conversation
  3. User can ask "show me open tickets" and receive filtered list by status, priority, or customer
  4. User can get ticket details with linked customer information (not just customer_id) in a single query
  5. User can search products by name or category using natural language phrases

**Plans**: 2 plans

Plans:

- [x] 02-01-PLAN.md -- Customer and product read tools (list_customers, get_customer, list_products, search_products)
- [x] 02-02-PLAN.md -- Ticket read tools with customer JOIN and name resolution (list_tickets, get_ticket)

### Phase 3: Write Operations & Analytics

**Goal**: Claude can modify business data and provide dashboard insights
**Depends on**: Phase 2
**Requirements**: CUST-03, CUST-04, TICK-03, TICK-04, ANLT-01
**Success Criteria** (what must be TRUE):

  1. User can create new customers with name, email, company, and status through conversation
  2. User can update existing customer fields and receive confirmation of changes
  3. User can create support tickets linked to customers and the system validates customer exists
  4. User can close tickets and the system sets closed_at timestamp while preventing duplicate closures
  5. User can ask "show me a summary" and receive composite stats: customer counts by status, open vs closed tickets, total product catalog value

**Plans**: 3 plans

Plans:

- [x] 03-01-PLAN.md -- Customer write tools (create_customer, update_customer)
- [x] 03-02-PLAN.md -- Ticket write tools (create_ticket, close_ticket) + resolution schema migration
- [x] 03-03-PLAN.md -- Analytics dashboard tool (get_summary)

### Phase 4: Seed Data & Portfolio Polish

**Goal**: Portfolio demo is ready to share with realistic data, setup instructions, and recorded demonstration
**Depends on**: Phase 3
**Requirements**: SEED-01, SEED-02, PLSH-01, PLSH-02, PLSH-03
**Success Criteria** (what must be TRUE):

  1. Demo database contains 20+ customers from diverse companies with varied statuses, 30+ tickets with realistic subjects and priority mix, 10+ products with believable pricing
  2. Prospects can follow setup guide to create Supabase project, run seed SQL, and connect to Claude Desktop in under 15 minutes
  3. README showcases the project with feature list, screen-recorded demo path, and clear self-serve setup instructions
  4. Claude Desktop config example is copy-paste ready with proper environment variable structure
  5. Demo conversation script covers all tool types: list, filter, create, close, search, analytics, and schema introspection

**Plans**: 2 plans

Plans:

- [ ] 04-01-PLAN.md -- Expand seed.sql with 20+ customers, 30+ tickets, 10+ products with narrative threads
- [ ] 04-02-PLAN.md -- Portfolio-grade README with feature list, architecture diagram, setup guide, demo conversation

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Infrastructure | 3/3 | Complete | 2026-02-08 |
| 2. Read Operations | 2/2 | Complete | 2026-02-08 |
| 3. Write Operations & Analytics | 3/3 | Complete | 2026-02-08 |
| 4. Seed Data & Portfolio Polish | 0/2 | Not started | - |

---
*Roadmap created: 2026-02-08*
*Last updated: 2026-02-08 after Phase 3 execution complete*
