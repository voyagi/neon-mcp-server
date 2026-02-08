# Architecture

**Analysis Date:** 2026-02-08

## Pattern Overview

**Overall:** MCP (Model Context Protocol) Server with layered data access

**Key Characteristics:**
- Stdio transport for Claude Desktop/Code integration
- Modular tool registration pattern (tools not yet implemented)
- Resource-based schema exposure
- Direct Supabase client integration
- TypeScript with strict typing for type safety

## Layers

**Transport Layer:**
- Purpose: Handle stdio communication between MCP server and Claude
- Location: `src/index.ts`
- Contains: StdioServerTransport initialization and lifecycle
- Depends on: @modelcontextprotocol/sdk
- Used by: Entry point, startup logic

**Server Layer:**
- Purpose: Initialize MCP server, register tools and resources
- Location: `src/server.ts`
- Contains: Server definition (McpServer instance), tool/resource registration hooks
- Depends on: @modelcontextprotocol/sdk, lib modules (when implemented)
- Used by: index.ts for server creation

**Data Access Layer:**
- Purpose: Query and manipulate Supabase database
- Location: `src/tools/` (customers.ts, tickets.ts, products.ts, analytics.ts - planned)
- Contains: CRUD operations, filtering, aggregation logic
- Depends on: lib/supabase.ts, lib/types.ts
- Used by: MCP tools exposed to Claude

**Integration Layer:**
- Purpose: Connect to external Supabase service
- Location: `src/lib/supabase.ts`
- Contains: Supabase client initialization with environment variables
- Depends on: @supabase/supabase-js
- Used by: Tools layer for database operations

**Schema Exposure Layer:**
- Purpose: Expose database schema as MCP resource for Claude discovery
- Location: `src/resources/schema.ts` (planned)
- Contains: Database schema reflection, table/column metadata
- Depends on: lib/supabase.ts, lib/types.ts
- Used by: MCP resource registration in server.ts

**Type Layer:**
- Purpose: Define shared domain models and type contracts
- Location: `src/lib/types.ts`
- Contains: TypeScript interfaces for Customer, Ticket, Product
- Depends on: (no dependencies)
- Used by: Tools layer, data access layer for type safety

## Data Flow

**Query Path (Claude → Data):**

1. Claude user prompts MCP server (via Claude Desktop/Code)
2. Stdio transport receives request in `src/index.ts`
3. Server routes to registered tool handler in `src/server.ts`
4. Tool implementation (e.g., `src/tools/customers.ts`) calls Supabase client
5. `src/lib/supabase.ts` executes query against remote Postgres database
6. Results returned through tool handler → transport → Claude

**Example: "Show me all open tickets"**

1. Claude makes tool call: `list_tickets` with filter `status: "open"`
2. `src/tools/tickets.ts` receives parameters
3. Queries Supabase: `SELECT * FROM tickets WHERE status = 'open'`
4. Returns `Ticket[]` (typed from `src/lib/types.ts`)
5. Tool handler formats response, sends to Claude via stdio

**Write Path (Claude → Data → Database):**

1. Claude calls tool: `create_ticket` with parameters (customer_id, subject, description, priority)
2. `src/tools/tickets.ts` validates input (Zod - not yet integrated)
3. Inserts row via `supabase.from('tickets').insert()`
4. Returns created Ticket object with generated UUID
5. Claude confirms creation to user

**State Management:**

- **No client-side state**: Server is stateless, session-oriented
- **Database is source of truth**: All state lives in Supabase
- **Request-response pattern**: Each Claude request is independent
- **Environment-based configuration**: Supabase credentials from `.env`

## Key Abstractions

**MCP Tools:**
- Purpose: Callable interfaces exposed to Claude for data operations
- Examples: `list_customers`, `get_ticket`, `create_ticket`, `get_summary`
- Pattern: Tool registration in `src/server.ts` with schema + handler function

**MCP Resources:**
- Purpose: Read-only data sources Claude can inspect (schema discovery)
- Examples: `schema://tables` resource showing all tables and columns
- Pattern: Resource registration in `src/server.ts` with URI and content provider

**Database Entities:**
- Purpose: Domain models representing business data
- Examples: `Customer`, `Ticket`, `Product` (defined in `src/lib/types.ts`)
- Pattern: TypeScript interfaces with strict field typing and nullable handling

**Supabase Client:**
- Purpose: Abstraction over Postgres database via REST/Realtime API
- Location: `src/lib/supabase.ts`
- Pattern: Singleton client instance, lazy-initialized from environment variables

## Entry Points

**Node Process Entry:**
- Location: `src/index.ts`
- Triggers: `node dist/index.js` (from Claude Desktop config)
- Responsibilities:
  - Create MCP server instance via `src/server.ts`
  - Initialize stdio transport
  - Connect transport to server
  - Handle startup errors and log to stderr

**Server Initialization:**
- Location: `src/server.ts`
- Triggers: Called by `src/index.ts` during startup
- Responsibilities:
  - Create McpServer instance with metadata (name, version)
  - Register all tools (customers, tickets, products, analytics)
  - Register all resources (schema)
  - Return ready server instance

## Error Handling

**Strategy:** Early exit on startup failure, error logging to stderr

**Patterns:**
- `src/index.ts` main() function wraps with try-catch, exits with code 1 on failure
- Console errors logged to stderr (not stdout, which is reserved for MCP protocol)
- Database connection errors propagate through tool handlers to Claude
- Validation errors (Zod) should return structured error responses in tool results

## Cross-Cutting Concerns

**Logging:**
- Console.error() to stderr during startup and diagnostics
- MCP protocol responses (not logged, returned to Claude)
- Consider adding structured logging when tools are implemented

**Validation:**
- Zod library available in dependencies but not yet integrated
- Should validate all tool input parameters before querying database
- Example: `list_tickets` should validate filter parameters (status must be in enum)

**Authentication:**
- Handled by Supabase credentials (SUPABASE_SERVICE_ROLE_KEY)
- Service role has full database access (not row-level security)
- Claude Desktop config passes credentials to server via environment variables
- No per-user auth (single shared service role for all Claude queries)

**Type Safety:**
- Strict TypeScript compilation (`strict: true` in tsconfig.json)
- Interface definitions in `src/lib/types.ts` drive compile-time safety
- Runtime validation via Zod (planned) for database responses

---

*Architecture analysis: 2026-02-08*
