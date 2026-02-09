# TechStart CRM — MCP Server

## What This Is

An MCP server that connects a Supabase Postgres database to Claude Desktop/Code, exposing a fictional small business CRM ("TechStart CRM") with customers, support tickets, and products. Claude can query, create, update, and analyze business data through natural language. 11 tools + 1 schema resource cover full CRUD operations, filtering, search, and analytics. This is portfolio piece #3 for an Upwork freelancing profile, demonstrating the ability to build custom MCP servers — the highest-value AI freelancing skill ($2K-15K per project).

## Core Value

Prospects who see this project should immediately think "he can build this for me" — a polished, working MCP server demo that proves real database integration with read AND write operations, not a toy example.

## Requirements

### Validated

- ✓ MCP server entry point with stdio transport — v1.0
- ✓ Server definition with tool/resource registration hooks — v1.0
- ✓ Supabase client with env validation and connection testing — v1.0
- ✓ TypeScript domain types (Customer, Ticket, Product) — v1.0
- ✓ Build/dev/lint/format toolchain (TypeScript, Biome, tsx) — v1.0
- ✓ Customer CRUD tools (list, get, create, update) — v1.0
- ✓ Ticket CRUD tools (list, get, create, close) — v1.0
- ✓ Product read tools (list, search) — v1.0
- ✓ Analytics summary tool (customer counts, ticket stats, catalog value) — v1.0
- ✓ Database schema MCP resource (schema://tables) — v1.0
- ✓ Zod input validation on all tool parameters — v1.0
- ✓ Seed SQL with realistic demo data (22 customers, 32 tickets, 12 products) — v1.0
- ✓ Supabase setup guide (create project, run seed SQL) — v1.0
- ✓ Portfolio README with demo conversation and setup guide — v1.0
- ✓ Claude Desktop integration config example — v1.0
- ✓ Demo conversation script covering all 7 tool types — v1.0

### Active

(None — v1.0 shipped. Start `/gsd:new-milestone` for v1.1 requirements.)

### Out of Scope

- Authentication/multi-user support — single service role key, this is a demo not a production system
- Real-time subscriptions — overkill for a portfolio demo, adds complexity without showcasing MCP skill
- Deployment/hosting — runs locally via Claude Desktop stdio transport
- Frontend/UI — the entire point is that Claude IS the interface
- Testing framework — portfolio demo, not production software; time better spent on polish
- DELETE operations — destructive in demos; use status changes (close, archive) instead
- HTTP/SSE transport — stdio sufficient for Claude Desktop; simpler setup for prospects
- Raw SQL execution tool — intent-focused tools only; raw SQL is an anti-pattern for MCP demos
- Pagination — demo scale doesn't need it; deferred to v2 if prospects request

## Context

Shipped v1.0 with 1,505 LOC TypeScript across 11 tools + 1 resource.
Tech stack: Node.js, TypeScript, @modelcontextprotocol/sdk, Supabase (PostgreSQL), Zod, Biome.
Demo dataset: 22 customers across 10+ industries, 32 tickets with narrative threads, 12 SaaS products.
README serves as both documentation and Upwork portfolio sales page.

## Constraints

- **Tech stack**: Node.js + TypeScript, @modelcontextprotocol/sdk, @supabase/supabase-js, Zod, Biome — all locked
- **Transport**: stdio only (Claude Desktop/Code integration)
- **Architecture**: src/ with tools/, resources/, lib/ structure
- **Database**: Supabase Postgres with service role key (no RLS)
- **Tool count**: 11 tools + 1 resource

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase over raw Postgres | Easier setup for prospects trying the demo, free tier available | ✓ Good — prospects can follow setup in <15 min |
| Service role key (no RLS) | Portfolio demo, not multi-tenant production; simpler setup | ✓ Good — no auth complexity for demo |
| stdio transport only | Standard for Claude Desktop integration, no HTTP complexity | ✓ Good — copy-paste config works |
| No test framework | Time investment better spent on polish and demo quality for portfolio purposes | ✓ Good — 298-line README with demo conversation |
| Very realistic seed data | Demo conversations feel believable, not contrived | ✓ Good — narrative threads, 10+ industries |
| Hardcoded schema resource | Runtime introspection unreliable; human-readable descriptions add value | ✓ Good — descriptions help Claude reason |
| Zod .strict() with enum errorMaps | Validation errors show invalid value and valid options | ✓ Good — helpful error messages |
| Read-before-write phase ordering | Validate data access patterns before allowing destructive operations | ✓ Good — caught JOIN patterns early |
| Promise.all for analytics | Minimize latency for composite dashboard queries | ✓ Good — parallel execution |
| Subquery FK resolution in seed SQL | Portable seed data, no hardcoded UUIDs | ✓ Good — works on any fresh Supabase project |

---
*Last updated: 2026-02-09 after v1.0 milestone*
