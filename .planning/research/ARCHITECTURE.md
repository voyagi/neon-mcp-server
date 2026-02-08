# Architecture Research

**Domain:** MCP Server with Database Backend (Supabase)
**Researched:** 2026-02-08
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Client (Claude)                       │
│                      (JSON-RPC 2.0)                          │
└───────────────────────┬──────────────────────────────────────┘
                        │ stdio transport
                        ↓
┌─────────────────────────────────────────────────────────────┐
│                   MCP Server Entry Point                     │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  McpServer (SDK)                                       │  │
│  │  - Lifecycle management                                │  │
│  │  - Tool registration                                   │  │
│  │  - Resource registration                               │  │
│  └───────────────────┬────────────────────────────────────┘  │
│                      │                                        │
├──────────────────────┴────────────────────────────────────────┤
│                     Tool Handlers Layer                       │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │
│  │Customer │  │ Ticket  │  │ Product │  │Analytics│          │
│  │  Tools  │  │  Tools  │  │  Tools  │  │  Tools  │          │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘          │
│       │            │            │            │                │
├───────┴────────────┴────────────┴────────────┴────────────────┤
│                   Data Access Layer                           │
│  ┌─────────────────────────────────────────────────────┐      │
│  │         Supabase Client (singleton)                 │      │
│  └─────────────────────────────────────────────────────┘      │
│                      │                                        │
└──────────────────────┼────────────────────────────────────────┘
                       │ PostgreSQL protocol
                       ↓
               ┌───────────────┐
               │   Supabase    │
               │  (Postgres)   │
               └───────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Entry Point (`index.ts`) | Transport setup, process lifecycle | Create server, initialize stdio transport, handle shutdown |
| Server Definition (`server.ts`) | Tool registration, capability negotiation | McpServer instance, register all tools/resources |
| Tool Handlers (`tools/*.ts`) | Business logic, input validation, query execution | Zod schemas, async handlers, response formatting |
| Data Access (`lib/supabase.ts`) | Database client singleton | Supabase client with service role key |
| Types (`lib/types.ts`) | Domain models, type safety | TypeScript interfaces matching DB schema |
| Resources (`resources/*.ts`) | Static/dynamic context data | Schema introspection, documentation |

## Recommended Project Structure

```
src/
├── index.ts              # MCP server entry point + transport setup
├── server.ts             # Server definition, tool + resource registration
├── tools/                # Tool handlers organized by domain
│   ├── customers.ts      # CRUD tools for customers table
│   ├── tickets.ts        # CRUD tools for tickets table
│   ├── products.ts       # Read-only tools for products table
│   └── analytics.ts      # Aggregate queries (counts, summaries)
├── resources/            # MCP resources (context data)
│   └── schema.ts         # Expose DB schema as MCP resource
└── lib/                  # Shared utilities
    ├── supabase.ts       # Supabase client singleton
    ├── types.ts          # Domain TypeScript types
    └── errors.ts         # Error handling utilities
```

### Structure Rationale

- **`tools/` by domain**: Tools are grouped by business entity (customers, tickets, products) rather than by operation type (list, create, update). This creates clear ownership boundaries and makes the codebase easier to navigate as it grows.

- **Separation of concerns**: Entry point (`index.ts`) handles transport/process lifecycle, server definition (`server.ts`) handles registration, and tool handlers contain business logic. This makes testing easier and reduces coupling.

- **Singleton data access**: The Supabase client is initialized once and imported where needed, avoiding connection pooling issues and reducing overhead.

- **Resources separate from tools**: Resources (like database schema) provide static context, while tools perform actions. Keeping them separate clarifies their different roles in the MCP architecture.

## Architectural Patterns

### Pattern 1: Tool Handler Structure

**What:** Standardized structure for all tool implementations with consistent validation, execution, and error handling.

**When to use:** For every tool in your MCP server.

**Trade-offs:** Requires more boilerplate initially but provides consistency across the codebase and makes debugging easier.

**Example:**
```typescript
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { Customer } from '../lib/types.js';

// Input validation schema
const ListCustomersSchema = z.object({
  status: z.enum(['active', 'inactive', 'lead']).optional(),
  company: z.string().optional(),
});

// Tool registration in server.ts
server.registerTool(
  'list_customers',
  {
    title: 'List Customers',
    description: 'List all customers, optionally filtered by status or company',
    inputSchema: ListCustomersSchema,
  },
  async (inputs) => {
    try {
      // Build query with optional filters
      let query = supabase.from('customers').select('*');

      if (inputs.status) {
        query = query.eq('status', inputs.status);
      }
      if (inputs.company) {
        query = query.ilike('company', `%${inputs.company}%`);
      }

      const { data, error } = await query;

      if (error) {
        return {
          content: [{
            type: 'text',
            text: `Database error: ${error.message}. Check the table exists and the query is valid.`
          }],
          isError: true,
        };
      }

      // Return both human-readable and structured content
      return {
        content: [{
          type: 'text',
          text: `Found ${data.length} customer(s):\n${JSON.stringify(data, null, 2)}`
        }],
        structuredContent: data,
      };
    } catch (err) {
      return {
        content: [{
          type: 'text',
          text: `Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}`
        }],
        isError: true,
      };
    }
  }
);
```

### Pattern 2: Feature-Based Tool Organization

**What:** Group related tools by business domain (entity type) rather than operation type. Each domain file exports multiple tools.

**When to use:** When you have multiple CRUD operations for the same entity, or when tools naturally cluster around business concepts.

**Trade-offs:** Files may grow larger but related functionality stays together. Easier to understand the complete feature set for a domain.

**Example:**
```typescript
// tools/customers.ts exports: list_customers, get_customer, create_customer, update_customer
// tools/tickets.ts exports: list_tickets, get_ticket, create_ticket, close_ticket
// tools/products.ts exports: list_products, search_products
// tools/analytics.ts exports: get_summary
```

### Pattern 3: Defensive Error Handling with Context

**What:** Distinguish between different error types (protocol, database, validation) and provide actionable context in error messages.

**When to use:** Always. Error quality directly impacts LLM recovery ability.

**Trade-offs:** Requires more code but dramatically improves debugging and user experience.

**Example:**
```typescript
// lib/errors.ts
export function formatDatabaseError(error: PostgrestError): string {
  const messages: string[] = [
    `Database operation failed: ${error.message}`,
  ];

  // Add context based on error code
  if (error.code === '42P01') {
    messages.push('The table does not exist. Check your database schema.');
  } else if (error.code === '23505') {
    messages.push('This violates a unique constraint. A record with this value already exists.');
  } else if (error.code === '23503') {
    messages.push('This violates a foreign key constraint. The referenced record does not exist.');
  }

  messages.push(`Error code: ${error.code}`);
  return messages.join(' ');
}

// Usage in tool handler
if (error) {
  return {
    content: [{ type: 'text', text: formatDatabaseError(error) }],
    isError: true,
  };
}
```

### Pattern 4: Dual-Format Response

**What:** Return both `content` (human/LLM-readable) and `structuredContent` (machine-parseable) in tool responses.

**When to use:** For all tools that return data (read operations, queries, summaries).

**Trade-offs:** Slightly more code but enables both conversational UX and programmatic use.

**Example:**
```typescript
// For conversational AI (content)
const summary = `Dashboard Summary:
- Total customers: ${customerCount}
- Open tickets: ${openTickets}
- Revenue (last 30 days): $${revenue / 100}`;

return {
  content: [{ type: 'text', text: summary }],
  structuredContent: {
    customerCount,
    openTickets,
    revenue,
    generatedAt: new Date().toISOString(),
  },
};
```

## Data Flow

### Request Flow

```
[User asks Claude: "Show me all open tickets"]
    ↓
[Claude invokes tool via JSON-RPC: tools/call "list_tickets" {status: "open"}]
    ↓
[MCP Server receives request] → [Validate inputs with Zod]
    ↓
[Tool handler executes] → [Supabase query: select * from tickets where status = 'open']
    ↓
[Supabase returns data] ← [PostgreSQL query execution]
    ↓
[Format response] → [Create content + structuredContent]
    ↓
[Return to Claude] ← [JSON-RPC response]
    ↓
[Claude presents results to user]
```

### Tool Registration Flow

```
[Process starts: npm start]
    ↓
[index.ts: Create server instance] → [server.ts: createServer()]
    ↓
[Register tools from each domain]
    ├─→ customers.ts: register 4 tools
    ├─→ tickets.ts: register 4 tools
    ├─→ products.ts: register 2 tools
    └─→ analytics.ts: register 1 tool
    ↓
[Register resources]
    └─→ schema.ts: register schema://tables
    ↓
[Connect stdio transport]
    ↓
[Server ready: await capability negotiation from client]
```

### Key Data Flows

1. **Tool discovery**: Client calls `tools/list` → Server returns array of tool definitions with schemas → Client knows available capabilities
2. **Tool execution**: Client calls `tools/call` with tool name + inputs → Server validates, executes query, formats response → Client receives data
3. **Error propagation**: Database error → Tool handler catches → Format with context → Return with `isError: true` → Client/LLM understands failure

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-100 users | Monolith MCP server with single Supabase client works perfectly. Optimize query patterns. |
| 100-1k users | Add connection pooling via Supabase's built-in pooler. Consider caching for expensive analytics queries. |
| 1k-10k users | Consider splitting read-heavy tools (analytics) into separate MCP server. Implement rate limiting per client. |
| 10k+ users | Migrate from stdio to Streamable HTTP transport for horizontal scaling. Add Redis for cross-instance caching. |

### Scaling Priorities

1. **First bottleneck**: Database query performance. Solution: Add indexes on frequently filtered columns (status, customer_id), use Supabase's query analyzer.
2. **Second bottleneck**: Complex aggregation queries (analytics tools). Solution: Implement result caching with TTL, or pre-compute summaries in materialized views.
3. **Third bottleneck**: Single-process stdio transport limit. Solution: Switch to HTTP transport, deploy multiple instances behind load balancer.

## Anti-Patterns

### Anti-Pattern 1: 1:1 REST-to-Tool Conversion

**What people do:** Convert every REST endpoint directly into an MCP tool without considering the AI use case.

**Why it's wrong:** Creates tools that are too granular for conversational AI. LLMs work best with task-oriented tools like "create_ticket" not low-level operations like "POST /tickets/validate" and "POST /tickets/insert".

**Do this instead:** Design tools around what the user/agent wants to achieve. One tool = one complete task. Combine multiple operations internally if needed.

### Anti-Pattern 2: Returning Raw SQL Errors

**What people do:** Return database error messages directly to the client.

**Why it's wrong:** Error messages like "ERROR: relation 'cusotmers' does not exist" (note typo) don't help the LLM recover. They lack context about valid options.

**Do this instead:** Parse error codes, add context about what went wrong and what the valid format/options are. Example: "Table 'cusotmers' not found. Available tables: customers, tickets, products. Did you mean 'customers'?"

### Anti-Pattern 3: Mixing Business Logic in server.ts

**What people do:** Put query logic directly in the tool registration callbacks within server.ts.

**Why it's wrong:** Makes server.ts massive and untestable. Violates single responsibility principle.

**Do this instead:** Keep server.ts minimal—only registration. Put all business logic in domain-specific files (tools/*.ts). Server.ts should be a "table of contents" not an implementation.

### Anti-Pattern 4: Unstructured Text-Only Responses

**What people do:** Return free-form text descriptions of data instead of structured results.

**Why it's wrong:** Forces the client to parse text, which is brittle and error-prone. Wastes tokens. Limits programmatic use.

**Do this instead:** Always return `structuredContent` with well-typed data, plus human-readable `content` for display. The dual format enables both conversational and programmatic use cases.

### Anti-Pattern 5: Global Error Handlers Only

**What people do:** Rely on a top-level try-catch to handle all errors uniformly.

**Why it's wrong:** Loses error context. Database errors need different handling than validation errors than permission errors.

**Do this instead:** Handle errors at the tool level where you have context. Classify errors (client vs server vs external) and provide specific guidance for each type.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase | SDK client with service role key | Use environment variables for URL and key. Service role bypasses RLS. |
| PostgreSQL | Indirect via Supabase client | Never connect directly; use Supabase's connection pooling and auth. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Tools ↔ Supabase Client | Direct import | Singleton client, no need for dependency injection at this scale. |
| Server ↔ Tools | Function calls during registration | Server.ts imports tool registration functions, calls them with server instance. |
| MCP Client ↔ Server | JSON-RPC 2.0 over stdio | Client initiates all communication; server responds. No websocket/polling needed. |

## Build Order Recommendations

Based on dependencies and risk:

1. **Phase 1: Foundation**
   - Set up Supabase client (`lib/supabase.ts`)
   - Define types (`lib/types.ts`)
   - Implement error utilities (`lib/errors.ts`)
   - **Why first**: Everything depends on these. No tools work without data access.

2. **Phase 2: Read-Only Tools**
   - Implement list/get tools for customers, tickets, products
   - Add schema resource (`resources/schema.ts`)
   - **Why second**: Lower risk (no data modification). Validates data access patterns work.

3. **Phase 3: Write Tools**
   - Implement create/update tools for customers
   - Implement create/close tools for tickets
   - **Why third**: Higher risk (data modification). Build on proven read patterns.

4. **Phase 4: Analytics**
   - Implement aggregate queries (`tools/analytics.ts`)
   - **Why last**: Most complex queries. Depends on understanding data relationships from earlier phases.

### Dependency Ordering

- `lib/*` → `tools/*` (tools depend on lib)
- `tools/*.ts` → `server.ts` (server registers tools)
- `server.ts` → `index.ts` (entry point uses server)
- Read operations → Write operations (validate patterns before allowing mutation)
- Simple queries → Complex aggregations (build query skills incrementally)

## Sources

**HIGH Confidence:**
- [Architecture overview - Model Context Protocol](https://modelcontextprotocol.io/docs/learn/architecture) - Official MCP specification
- [TypeScript SDK server documentation](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/server.md) - Official SDK docs
- [MCP Best Practices](https://modelcontextprotocol.info/docs/best-practices/) - Community best practices
- [Supabase MCP Server](https://github.com/supabase-community/supabase-mcp) - Real-world Supabase MCP implementation

**MEDIUM Confidence:**
- [MCP is Not the Problem, It's your Server: Best Practices](https://www.philschmid.de/mcp-best-practices) - Production patterns
- [Error Handling in MCP Servers - Best Practices Guide](https://mcpcat.io/guides/error-handling-custom-mcp-servers/) - Error handling patterns
- [MCP Response Formatting: Guide & Best Practices 2025](https://www.byteplus.com/en/topic/541423) - Response formatting guidance

---
*Architecture research for: MCP Server with Supabase Backend*
*Researched: 2026-02-08*
