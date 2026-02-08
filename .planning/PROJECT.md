# TechStart CRM — MCP Server

## What This Is

An MCP server that connects a Supabase Postgres database to Claude Desktop/Code, exposing a fictional small business CRM ("TechStart CRM") with customers, support tickets, and products. Claude can query and modify business data through natural language. This is portfolio piece #3 for an Upwork freelancing profile, demonstrating the ability to build custom MCP servers — the highest-value AI freelancing skill ($2K-15K per project).

## Core Value

Prospects who see this project should immediately think "he can build this for me" — a polished, working MCP server demo that proves real database integration with read AND write operations, not a toy example.

## Requirements

### Validated

- ✓ MCP server entry point with stdio transport — existing
- ✓ Server definition with tool/resource registration hooks — existing
- ✓ Supabase client initialization from environment variables — existing
- ✓ TypeScript domain types (Customer, Ticket, Product) — existing
- ✓ Build/dev/lint/format toolchain (TypeScript, Biome, tsx) — existing
- ✓ Project dependencies installed (MCP SDK, Supabase JS, Zod) — existing

### Active

- [ ] Customer CRUD tools (list, get, create, update)
- [ ] Ticket CRUD tools (list, get, create, close)
- [ ] Product read tools (list, search)
- [ ] Analytics summary tool (total customers, open tickets, revenue)
- [ ] Database schema MCP resource (schema://tables)
- [ ] Zod input validation on all tool parameters
- [ ] Seed SQL with very realistic demo data (~20 customers, ~30 tickets, ~10 products)
- [ ] Supabase setup guide (create project, run seed SQL)
- [ ] Polished README — video demo path + self-serve setup guide
- [ ] Claude Desktop integration config example
- [ ] Screen-recorded demo conversation showcasing tool variety

### Out of Scope

- Authentication/multi-user support — single service role key, this is a demo not a production system
- Real-time subscriptions — overkill for a portfolio demo, adds complexity without showcasing MCP skill
- Deployment/hosting — runs locally via Claude Desktop stdio transport
- Frontend/UI — the entire point is that Claude IS the interface
- Testing framework — portfolio demo, not production software; time better spent on polish

## Context

- MCP is cutting-edge — most Upwork freelancers don't know it yet, making this a strong differentiator
- Portfolio pieces #1 (AI chatbot) and #2 (n8n automation) prove breadth; this one proves depth
- Scaffolding is complete: package.json, tsconfig, biome.json, entry point, server definition, types, Supabase client
- Tools and resources are not yet implemented — the core work remains
- Seed data should feel very realistic: diverse companies, multi-status tickets with history, realistic product pricing
- README serves double duty: documentation AND sales page for the Upwork profile
- Demo should showcase technical variety: CRUD operations, filtering, analytics, schema introspection

## Constraints

- **Tech stack**: Node.js + TypeScript, @modelcontextprotocol/sdk, @supabase/supabase-js, Zod, Biome — all locked
- **Transport**: stdio only (Claude Desktop/Code integration)
- **Architecture**: Already scaffolded in src/ — follow existing structure
- **Database**: Supabase Postgres with service role key (no RLS)
- **Tool count**: ~11 tools + 1 resource as specified in CLAUDE.md

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase over raw Postgres | Easier setup for prospects trying the demo, free tier available | — Pending |
| Service role key (no RLS) | Portfolio demo, not multi-tenant production; simpler setup | — Pending |
| stdio transport only | Standard for Claude Desktop integration, no HTTP complexity | — Pending |
| No test framework | Time investment better spent on polish and demo quality for portfolio purposes | — Pending |
| Very realistic seed data | Demo conversations feel believable, not contrived | — Pending |

---
*Last updated: 2026-02-08 after initialization*
