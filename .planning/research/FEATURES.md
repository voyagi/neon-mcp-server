# Feature Research

**Domain:** MCP Server CRM Integration
**Researched:** 2026-02-08
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Basic CRUD tools (list, get, create, update) | Standard database operations; every MCP server demo has them | LOW | Customer and ticket tools are required. Delete is risky for demos; prefer status updates (e.g., archive) |
| Schema introspection resource | Enables Claude to understand data structure; essential for natural language queries | LOW | MCP resources are designed for this. Supabase MCP exposes `generate_typescript_types`; similar pattern applies |
| Filtering on list operations | Users expect "show me open tickets" or "customers from Acme" | LOW | Pass filter params to SQL WHERE clauses. Industry standard in GA4, Supabase MCP examples |
| Error handling with actionable messages | MCP servers fail visibly; poor errors destroy demo credibility | MEDIUM | "Customer not found (ID: xyz). Use list_customers to see available IDs" not just "Error 404" |
| Natural language-friendly tool descriptions | Claude selects tools based on descriptions; vague descriptions = failed demos | LOW | "List all customers with optional filters by status or company" not "Get customers" |
| Realistic seed data | Toy data (Customer 1, Customer 2) makes demos unconvincing | LOW | 20+ customers with real company names, varied ticket subjects, believable timestamps |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Composite analytics tool (`get_summary`) | Shows you understand MCP design patterns; avoids "tool explosion" anti-pattern | MEDIUM | Single tool returns dashboard stats (total customers, open tickets, avg resolution time) instead of 5+ narrow tools. References: MCP best practices, Oracle Analytics MCP |
| Pagination with row estimation | Handles large datasets professionally; GA4 MCP does this | MEDIUM | For `list_*` tools, warn if >100 results, return first page with total count. "Showing 100 of 237 customers. Use offset param for more." |
| Cross-entity queries | Demonstrates relational thinking; `get_ticket` includes customer info via JOIN | MEDIUM | Returns ticket with nested customer object instead of just customer_id. Shows understanding of LLM context needs |
| Intent-focused tools over raw CRUD | Professional MCP pattern; `close_ticket` instead of `update_ticket(status='closed')` | LOW | Easier for Claude to understand intent. References: Philipp Schmid MCP best practices, Cloudflare MCP demos |
| Validation with helpful errors | Prevents invalid states; e.g., can't close already-closed ticket | MEDIUM | Use Zod for input validation. Return errors like "Ticket already closed on 2026-01-15. Current status: closed" |
| Project-scoping context | Mirrors Supabase MCP security pattern | LOW | Add project/tenant ID to demo data. Shows understanding of multi-tenant patterns even in simple demo |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| One tool per SQL table | "Consistency" - matches REST API pattern | Tool explosion: 20 tables = 60+ tools (list/get/create/update/delete each). Reduces Claude's accuracy. References: MCP anti-patterns guide | Group by domain: customers (4 tools), tickets (4 tools), products (2 read-only), analytics (1 composite) |
| DELETE operations in demo | Completeness - "full CRUD" | Destructive actions in portfolio demos are risky; reviewers might accidentally delete data | Use soft deletes (status='archived') or dedicated `archive_customer` tool instead |
| Real-time notifications (`tools/list_changed`) | Seems advanced/impressive | Invalidates Claude Desktop cache, increases costs, adds complexity with no demo value. References: MCP pitfalls guide | Skip entirely for portfolio. Note in docs "could add notifications for production use" |
| Complex search with fuzzy matching | "AI needs powerful search" | Over-engineering; Postgres ILIKE is sufficient for CRM demo scale | Simple `WHERE name ILIKE '%search%'` for customer/product search. Save fuzzy matching for production |
| Heavy analytics/ML in server | "Make the server smart" | Anti-pattern: MCP servers should be information providers, not decision engines. References: MCP design principles | Keep aggregations simple (COUNT, SUM, AVG). Let Claude interpret results, not the server |
| Authentication/authorization system | "Production-ready features" | Overkill for portfolio demo; adds 100+ lines of code with no value to Upwork prospects | Use service role key in env vars. Note in README "production would use OAuth 2.1 + RLS" |
| HTTP/SSE transport | "Remote servers are modern" | Stdio is simpler for demos, works with Claude Desktop out-of-box, fewer security concerns | Use stdio. Note "supports HTTP transport" in docs if asked |

## Feature Dependencies

```
[list_customers]
    └──used by──> [get_customer] (needs customer IDs from list)
                      └──used by──> [create_ticket] (link ticket to customer)

[list_tickets] ──filters by──> [customer_id] (show tickets for specific customer)

[get_summary] ──aggregates──> [customers, tickets, products] (needs all tables)

[schema resource] ──informs──> [ALL tools] (Claude uses schema to understand data structure)

[close_ticket] ──validates──> [ticket status] (can't close already-closed ticket)
```

### Dependency Notes

- **Schema resource must be implemented first:** Claude needs to understand table structure before using any CRUD tools effectively
- **List operations enable detail operations:** `list_customers` provides IDs that `get_customer` and other tools consume
- **Analytics depends on all tables:** `get_summary` should be implemented last after all CRUD tools work
- **Cross-entity tools require JOINs:** `get_ticket` (with customer info) depends on both tickets and customers tables
- **Validation tools need existing data:** `close_ticket` validation requires ticket already exists and is open

## MVP Definition

### Launch With (v1 - Portfolio Demo)

Minimum viable product - what's needed to impress Upwork prospects.

- [x] **Schema resource (`schema://tables`)** - Essential for Claude to understand data structure
- [x] **Customer CRUD (4 tools)** - `list_customers`, `get_customer`, `create_customer`, `update_customer`
- [x] **Ticket CRUD (4 tools)** - `list_tickets`, `get_ticket`, `create_ticket`, `close_ticket` (intent-focused, not raw update)
- [x] **Product read tools (2 tools)** - `list_products`, `search_products` (demonstrates read-only pattern)
- [x] **Analytics composite tool (1 tool)** - `get_summary` (differentiator: avoids tool explosion)
- [x] **Realistic seed data** - 20 customers, 30 tickets (mix of open/closed), 10 products
- [x] **Input validation with Zod** - All tools validate inputs and return helpful errors
- [x] **Screen-recorded demo** - 2-3 minute conversation showing natural language queries

**Total: 11 tools + 1 resource** - Demonstrates variety without tool explosion.

### Add After Validation (Post-Portfolio)

Features to add if Upwork prospects request them or for production client work.

- [ ] **Pagination for list operations** - If prospects ask "what about large datasets?"
- [ ] **Cross-entity search** - e.g., "find tickets mentioning 'billing' from Acme Corp customers"
- [ ] **Bulk operations** - e.g., `close_multiple_tickets` (shows composite pattern understanding)
- [ ] **Audit logging** - Track who/what/when for compliance-focused prospects
- [ ] **Webhook notifications** - Real-time updates when tickets created/closed
- [ ] **Custom fields/metadata** - JSONB columns for flexible CRM customization

### Future Consideration (Production Clients)

Features to defer until actual client work, not portfolio.

- [ ] **OAuth 2.1 authentication** - Production requirement; overkill for demo
- [ ] **Row-Level Security (RLS)** - Multi-tenant security; not needed for single-tenant demo
- [ ] **HTTP/SSE transport** - Remote MCP servers; stdio sufficient for portfolio
- [ ] **Real-time notifications (`tools/list_changed`)** - Adds complexity, invalidates cache
- [ ] **Advanced analytics** - Churn prediction, sentiment analysis, forecasting
- [ ] **Integration tools** - Connect to Slack, email, calendar (expands scope too much)

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Schema resource | HIGH | LOW | P1 |
| Customer list/get | HIGH | LOW | P1 |
| Ticket list/get/create | HIGH | LOW | P1 |
| `get_summary` analytics | MEDIUM | MEDIUM | P1 |
| Customer create/update | MEDIUM | LOW | P1 |
| `close_ticket` (intent-focused) | MEDIUM | LOW | P1 |
| Product read tools | MEDIUM | LOW | P1 |
| Realistic seed data | HIGH | LOW | P1 |
| Input validation errors | HIGH | MEDIUM | P1 |
| Pagination | MEDIUM | MEDIUM | P2 |
| Cross-entity search | MEDIUM | MEDIUM | P2 |
| Bulk operations | LOW | MEDIUM | P2 |
| Audit logging | LOW | MEDIUM | P3 |
| OAuth authentication | LOW | HIGH | P3 |
| HTTP/SSE transport | LOW | HIGH | P3 |
| RLS multi-tenancy | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for portfolio launch (demo credibility)
- P2: Should have if prospects ask (production readiness signals)
- P3: Nice to have for actual client work (not portfolio)

## Competitor Feature Analysis

| Feature | Supabase MCP (Official) | DB MCP Server (Community) | Our Approach |
|---------|-------------------------|---------------------------|--------------|
| Tool organization | 8 feature groups, 20+ tools | Generic CRUD across multiple DBs | 4 domains (customers, tickets, products, analytics), 11 focused tools |
| Schema introspection | `generate_typescript_types` | `explore_schema` | `schema://tables` resource (MCP-native pattern) |
| Query execution | `execute_sql` (raw SQL) | `execute_query` (raw SQL) | No raw SQL; intent-focused tools only (safer for demos) |
| Analytics | Separate tools per metric | None | Single `get_summary` composite tool (anti-tool-explosion) |
| Validation | Minimal | Basic SQL validation | Zod input validation + business logic (e.g., can't close closed ticket) |
| Authentication | OAuth 2.1 + project scoping | Connection strings | Service role key (sufficient for demo) |
| Transport | HTTP/SSE (remote) | Stdio + HTTP | Stdio only (simpler for portfolio) |
| Target use case | Full Supabase management | Multi-DB data access | CRM business operations (focused demo) |

**Our differentiator:** Intent-focused tools for business operations vs generic database access. Shows we understand MCP design patterns (composite tools, avoiding tool explosion) not just wrapping SQL.

## Sources

- [Model Context Protocol Architecture](https://modelcontextprotocol.io/docs/learn/architecture) - HIGH confidence
- [MCP Reference Servers](https://github.com/modelcontextprotocol/servers) - HIGH confidence
- [Supabase MCP Documentation](https://supabase.com/docs/guides/getting-started/mcp) - HIGH confidence
- [MCP Best Practices (Philipp Schmid)](https://www.philschmid.de/mcp-best-practices) - MEDIUM confidence
- [MCP Patterns & Anti-Patterns (Medium)](https://medium.com/@thirugnanamk/mcp-patterns-anti-patterns-for-implementing-enterprise-ai-d9c91c8afbb3) - MEDIUM confidence
- [MCP Security Survival Guide (Towards Data Science)](https://towardsdatascience.com/the-mcp-security-survival-guide-best-practices-pitfalls-and-real-world-lessons/) - MEDIUM confidence
- [Google Analytics 4 MCP Server](https://github.com/surendranb/google-analytics-mcp) - MEDIUM confidence
- [Oracle Analytics Cloud MCP Server](https://blogs.oracle.com/analytics/oracle-analytics-cloud-mcp-server-bridging-enterprise-analytics-and-ai) - MEDIUM confidence
- [DB MCP Server](https://github.com/FreePeak/db-mcp-server) - MEDIUM confidence
- [Cloudflare MCP Demo Day](https://blog.cloudflare.com/mcp-demo-day/) - MEDIUM confidence

---
*Feature research for: MCP Server CRM Integration*
*Researched: 2026-02-08*
