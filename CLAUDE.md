# Supabase MCP Server — Upwork Portfolio Project

## Purpose

Portfolio demo for an Upwork freelancing profile. Demonstrates ability to
build custom MCP (Model Context Protocol) servers that connect business
data to AI assistants like Claude. This is project #3 of 4 portfolio
pieces — and the highest-value skill ($2K-15K per project on Upwork).

Full Upwork strategy: `C:\Users\Eagi\Making money\side-projects\upwork-strategy.md`

## What to Build

An **MCP server** that connects a Supabase database to Claude Desktop/Code,
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
- **Database**: Supabase (Postgres)
- **Validation**: Zod
- **Linter/Formatter**: Biome
- **Transport**: stdio (for Claude Desktop/Code integration)

## Architecture

```
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
    supabase.ts         — Supabase client
    types.ts            — Shared TypeScript types
seed/
  seed.sql              — Demo data for the CRM tables
  setup.md              — How to set up the Supabase project
```

## MCP Tools to Implement

### Customers

| Tool | Description |
|------|-------------|
| `list_customers` | List all customers, optionally filter by status or company |
| `get_customer` | Get a single customer by ID |
| `create_customer` | Add a new customer |
| `update_customer` | Update customer fields |

### Tickets

| Tool | Description |
|------|-------------|
| `list_tickets` | List tickets, filter by status (open/closed) or customer |
| `get_ticket` | Get ticket details including customer info |
| `create_ticket` | Create a new support ticket |
| `close_ticket` | Mark a ticket as resolved |

### Products

| Tool | Description |
|------|-------------|
| `list_products` | List all products with pricing |
| `search_products` | Search products by name or category |

### Analytics

| Tool | Description |
|------|-------------|
| `get_summary` | Dashboard stats: total customers, open tickets, revenue |

## MCP Resources

| Resource | URI | Description |
|----------|-----|-------------|
| Database schema | `schema://tables` | Lists all tables and columns |

## Database Schema (Supabase)

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
  closed_at timestamptz
);
```

## Environment Variables

Copy `.env.example` to `.env` and fill in:

- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (server-side, full access)

## Claude Desktop Integration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "techstart-crm": {
      "command": "node",
      "args": ["C:/Users/Eagi/upwork-mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "eyJ..."
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
```

## Browser Testing

For any task that requires visual verification, clicking, typing, form
testing, or seeing a rendered page: use the dev-browser skill in
`.claude/skills/dev-browser/`. Read its `SKILL.md` for the API.

- ALWAYS use extension mode (`npm run start-extension`) — connects to the
  user's Chrome, no separate window
- NEVER install Playwright MCP or write raw Playwright scripts
- Use `client.page()`, `client.getAISnapshot()`, `page.screenshot()`
- If the skill isn't deployed yet, copy from `~/.claude/skill-library/dev-browser/`

## Demo Strategy

1. Seed Supabase with realistic demo data (20 customers, 30 tickets, 10 products)
2. Connect to Claude Desktop
3. Screen-record a conversation: "Show me open tickets" → "Create a ticket for..." → "Get summary stats"
4. Show Claude understanding the data naturally
5. Export screenshots for Upwork portfolio
