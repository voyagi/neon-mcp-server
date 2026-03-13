# Neon MCP Server — Upwork Portfolio Project

## Purpose

Portfolio demo for an Upwork freelancing profile. Demonstrates ability to
build custom MCP (Model Context Protocol) servers that connect business
data to AI assistants like Claude. This is project #3 of 4 portfolio
pieces — and the highest-value skill ($2K-15K per project on Upwork).

## What to Build

An **MCP server** that connects a Neon Postgres database to Claude Desktop/Code,
allowing natural language queries against business data.

### Demo Scenario: "TechStart CRM"

A fictional small business CRM with:

- **Customers** — name, email, company, status
- **Tickets** — support tickets linked to customers
- **Products** — catalog with pricing

The MCP server exposes this data so Claude can:

- "Show me all open tickets"
- "Find customers from Acme Corp"
- "What's our most expensive product?"
- "Create a new ticket for John about billing"
- "How many customers signed up this month?"

### Why This Impresses Upwork Clients

- MCP is cutting-edge (most freelancers don't know it yet)
- Shows real database integration, not toy examples
- Demonstrates both read AND write operations
- Clients can test it themselves in Claude Desktop

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **MCP SDK**: @modelcontextprotocol/sdk
- **Database**: Neon Postgres (@neondatabase/serverless)
- **Validation**: Zod
- **Linter/Formatter**: Biome
- **Transport**: stdio (for Claude Desktop/Code integration)

## Architecture

```text
src/
  index.ts              — MCP server entry point + transport setup
  server.ts             — Server definition, tool + resource registration
  tools/
    customers.ts        — CRUD tools for customers table
    tickets.ts          — CRUD tools for tickets table
    products.ts         — Read tools for products table
    analytics.ts        — Aggregate queries (counts, summaries)
  resources/
    schema.ts           — Expose DB schema as MCP resource
  lib/
    db.ts               — Neon database client (sql tagged templates + query helper)
    customers.ts        — Customer lookup/validation helpers
    errors.ts           — PostgreSQL error code helpers
    formatters.ts       — Product price formatting
    responses.ts        — MCP tool response helpers
    validation.ts       — Zod schemas and sanitization
seed/
  schema.sql            — Table definitions
  seed.sql              — Demo data (22 customers, 32 tickets, 12 products)
  run-seed.mjs          — Script to create tables and seed data
  e2e-test.mjs          — E2E tests against live database
```

## MCP Tools

### Customers

| Tool | Description |
|------|-------------|
| `list_customers` | List all customers, optionally filter by status or company |
| `get_customer` | Get a single customer by ID, including ticket summary |
| `create_customer` | Add a new customer |
| `update_customer` | Update customer fields |

### Tickets

| Tool | Description |
|------|-------------|
| `list_tickets` | List tickets, filter by status, priority, customer ID, or customer name |
| `get_ticket` | Get ticket details including linked customer info |
| `create_ticket` | Create a new support ticket |
| `close_ticket` | Mark a ticket as resolved with optional resolution note |

### Products

| Tool | Description |
|------|-------------|
| `list_products` | List all products with pricing |
| `search_products` | Search products by name, category, or description |

### Analytics

| Tool | Description |
|------|-------------|
| `get_summary` | Dashboard stats: customer counts, ticket stats, product catalog value, recent activity |

## MCP Resources

| Resource | URI | Description |
|----------|-----|-------------|
| Database schema | `schema://tables` | Full schema with columns, types, constraints, relationships |

## Database Schema (Neon Postgres)

```sql
create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  company text,
  status text not null default 'active' check (status in ('active', 'inactive', 'lead')),
  created_at timestamptz default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  price_cents integer not null,
  description text,
  created_at timestamptz default now()
);

create table tickets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  subject text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'closed')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  created_at timestamptz default now(),
  closed_at timestamptz,
  resolution text
);
```

## Environment Variables

Copy `.env.example` to `.env` and fill in:

- `DATABASE_URL` — Neon Postgres connection string

## Claude Desktop Integration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "techstart-crm": {
      "command": "node",
      "args": ["/absolute/path/to/upwork-mcp-server/dist/index.js"],
      "env": {
        "DATABASE_URL": "postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"
      }
    }
  }
}
```

## Commands

```bash
npm run build    # Compile TypeScript
npm run dev      # Run with tsx watch (hot reload)
npm run start    # Run compiled version
npm run check    # Biome check
npm test         # Run unit tests (81 tests)
```

## Database Setup

```bash
# Set DATABASE_URL in .env, then:
node seed/run-seed.mjs   # Creates tables + seeds demo data
node seed/e2e-test.mjs   # Runs 14 E2E tests against live DB
```

## Demo Strategy

1. Seed Neon with realistic demo data (22 customers, 32 tickets, 12 products)
2. Connect to Claude Desktop
3. Screen-record a conversation: "Show me open tickets" → "Create a ticket for..." → "Get summary stats"
4. Show Claude understanding the data naturally
5. Export screenshots for Upwork portfolio
