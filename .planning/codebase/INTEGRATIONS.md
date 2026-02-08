# External Integrations

**Analysis Date:** 2026-02-08

## APIs & External Services

**Model Context Protocol (MCP):**
- Claude Desktop / Claude Code - AI assistant integration
  - SDK: @modelcontextprotocol/sdk
  - Transport: stdio (standard input/output)
  - Entry point: `src/index.ts` creates `StdioServerTransport` for bidirectional communication

## Data Storage

**Primary Database:**
- Supabase (PostgreSQL)
  - Client: @supabase/supabase-js 2.49.4
  - Connection: Environment variables `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
  - Location: `src/lib/supabase.ts` - Creates singleton client instance
  - Tables planned (defined in CLAUDE.md):
    - `customers` - CRM customer records (id, name, email, company, status, created_at)
    - `products` - Product catalog (id, name, category, price_cents, description, created_at)
    - `tickets` - Support tickets (id, customer_id, subject, description, status, priority, created_at, closed_at)

**File Storage:**
- Not integrated - Codebase uses database-only storage

**Caching:**
- Not detected - No cache layer configured

## Authentication & Identity

**Auth Provider:**
- Supabase Service Role Authentication
  - Implementation: Service role key for server-side access (full database permissions)
  - Credentials location: Environment variable `SUPABASE_SERVICE_ROLE_KEY`
  - Scope: `src/lib/supabase.ts` initializes client with service role
  - Note: Service role key required only for writing data; read access also available

## Validation & Type Safety

**Schema Validation:**
- Zod 3.24.4 - Runtime validation framework
- Planned usage (per CLAUDE.md):
  - Validate MCP tool input parameters
  - Validate database responses from Supabase

**Type Definitions:**
- Location: `src/lib/types.ts`
- Defined types:
  - `Customer` - Extends Supabase customer table with UUID id and timestamp
  - `Product` - Extends Supabase product table
  - `Ticket` - Extends Supabase ticket table with lifecycle timestamps

## Monitoring & Observability

**Error Tracking:**
- Not detected - No external error tracking service

**Logs:**
- Console output via `console.error()`
- Location: `src/index.ts` logs server startup and initialization errors
- Transport: stderr (stdio server lifecycle messages)

## CI/CD & Deployment

**Hosting:**
- Claude Desktop / Claude Code (local execution)
- Deployment method: User adds MCP server entry to `claude_desktop_config.json`

**CI Pipeline:**
- Not detected - No CI/CD service configured

## Environment Configuration

**Required Environment Variables:**
- `SUPABASE_URL` - Supabase project URL (format: `https://<project-id>.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role JWT token for database access

**Secrets Location:**
- `.env` file (not committed; listed in `.gitignore`)
- Example template: `.env.example` provides variable names and format hints

**Configuration Files:**
- Location: `c:\Users\Eagi\.claude\CLAUDE.md` includes Claude Desktop integration example

## Webhooks & Callbacks

**Incoming:**
- Not applicable - MCP server is passive; responds to Claude requests only

**Outgoing:**
- Not planned - Tools defined in CLAUDE.md are read/write operations against Supabase, not webhook triggers

## Data Models & Schema

**Supabase PostgreSQL Tables (planned):**

```sql
customers (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  company text,
  status text ('active', 'inactive', 'lead'),
  created_at timestamptz
)

products (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  price_cents integer NOT NULL,
  description text,
  created_at timestamptz
)

tickets (
  id uuid PRIMARY KEY,
  customer_id uuid REFERENCES customers(id),
  subject text NOT NULL,
  description text,
  status text ('open', 'in_progress', 'closed'),
  priority text ('low', 'medium', 'high', 'urgent'),
  created_at timestamptz,
  closed_at timestamptz
)
```

## MCP Tools & Resources (Planned)

**Tools (functions Claude can call):**
- Customers: `list_customers`, `get_customer`, `create_customer`, `update_customer`
- Tickets: `list_tickets`, `get_ticket`, `create_ticket`, `close_ticket`
- Products: `list_products`, `search_products`
- Analytics: `get_summary`

**Resources (data Claude can read):**
- Database schema: `schema://tables` - Exposes table definitions and columns

---

*Integration audit: 2026-02-08*
