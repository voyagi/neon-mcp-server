# Stack Research: MCP Server with Supabase Integration

**Domain:** MCP server connecting Supabase database to Claude Desktop/Code
**Researched:** 2026-02-08
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js + TypeScript | Node 16+, TS 5.8+ | Runtime + type safety | Standard for MCP servers; v1.x TypeScript SDK is production-ready (v2 in pre-alpha). Node 16+ required by SDK. TypeScript provides compile-time safety for MCP tool definitions. |
| @modelcontextprotocol/sdk | ^1.12.1 | MCP server implementation | Official TypeScript SDK. v1.x is stable and recommended for production. v2 (pre-alpha) expected Q1 2026 but not yet stable. Provides types for messages, tools, resources, transports. |
| @supabase/supabase-js | ^2.49.4 | Supabase client | Current stable version. Note: Node.js 18 support dropped in v2.79.0, so ensure compatible Node version. Provides query builder, auth, real-time features. |
| Zod | ^3.24.4 | Schema validation | Required peer dependency for MCP SDK. Provides runtime validation + compile-time type inference for tool inputs. TypeScript SDK auto-generates tool definitions from Zod schemas. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Biome | 2.0.0 | Linter + formatter | All TypeScript projects. Replaces ESLint + Prettier with single fast tool. |
| tsx | ^4.19.4 | Dev runtime | Development hot-reload with `tsx watch`. Faster than ts-node. |
| @types/node | ^22.15.0 | Node.js types | All TypeScript projects targeting Node.js. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| TypeScript compiler (tsc) | Production build | Compiles to ES2022/Node16 modules for distribution. |
| StdioServerTransport | MCP stdio transport | Standard for Claude Desktop integration. Writes JSON-RPC to stdout. |

## Installation

```bash
# Core dependencies
npm install @modelcontextprotocol/sdk @supabase/supabase-js zod

# Dev dependencies
npm install -D @biomejs/biome @types/node tsx typescript
```

## MCP SDK Patterns

### Server Setup (TypeScript)

**Pattern: McpServer initialization**
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({
  name: "server-name",
  version: "1.0.0",
});

// Register tools/resources here

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Server running on stdio"); // stderr only!
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
```

**Confidence:** HIGH (verified from official MCP docs)

### Tool Registration with Zod

**Pattern: Tool definition with validation**
```typescript
import { z } from "zod";

server.registerTool(
  "tool_name",
  {
    description: "Clear description for AI",
    inputSchema: {
      paramName: z.string().min(1).describe("Parameter description"),
      optionalParam: z.number().optional().describe("Optional number"),
    },
  },
  async ({ paramName, optionalParam }) => {
    // Handler automatically receives validated params
    // Type-safe access to paramName (string) and optionalParam (number | undefined)

    return {
      content: [
        {
          type: "text",
          text: "Result string",
        },
      ],
    };
  }
);
```

**Key benefits:**
- Zod schema auto-validates input before handler runs
- TypeScript infers parameter types from Zod schema
- Invalid input returns structured error without executing handler
- Description fields help AI understand tool usage

**Confidence:** HIGH (verified from MCP docs and TypeScript SDK examples)

### Resource Registration

**Pattern: Static resource (e.g., schema info)**
```typescript
server.registerResource(
  "schema://tables",
  {
    description: "Database schema information",
    mimeType: "application/json",
  },
  async () => {
    return {
      contents: [
        {
          uri: "schema://tables",
          mimeType: "application/json",
          text: JSON.stringify(schemaData),
        },
      ],
    };
  }
);
```

**Confidence:** HIGH (official MCP pattern)

### Error Handling

**Critical STDIO rule:** Never write to stdout (console.log). Use stderr (console.error).

**Pattern: MCP protocol errors**
```typescript
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

// In tool handler:
if (!validInput) {
  throw new McpError(
    ErrorCode.InvalidParams,
    "Parameter X must be non-empty"
  );
}

// Global error handler pattern:
server.registerTool("tool", schema, async (params) => {
  try {
    // Tool logic
  } catch (error) {
    console.error("Tool error:", error); // Log to stderr
    throw new McpError(ErrorCode.InternalError, "Failed to execute tool");
  }
});
```

**Best practices:**
- Use `McpError` with specific `ErrorCode` for protocol-compliant errors
- Log debugging info to stderr, never stdout
- Fail fast with clear error messages
- Don't leak internal details to client
- Implement signal handlers (SIGINT, SIGTERM) for clean shutdown

**Confidence:** HIGH (verified from multiple sources)

## Supabase Query Patterns

### Client Setup

**Pattern: Service role client (server-side only)**
```typescript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // NEVER expose to client
);
```

**Security critical:** Service role key bypasses RLS. Only use server-side.

**Confidence:** HIGH (official Supabase docs)

### Basic Query Patterns

**Pattern: Select with filters**
```typescript
// Select specific columns
const { data, error } = await supabase
  .from('customers')
  .select('id, name, email')
  .eq('status', 'active')
  .order('created_at', { ascending: false })
  .limit(10);

// Select with relationships (joins)
const { data, error } = await supabase
  .from('tickets')
  .select(`
    id,
    subject,
    status,
    customer:customers(id, name, email)
  `)
  .eq('status', 'open');

// Count query
const { count, error } = await supabase
  .from('customers')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'active');
```

**Best practices:**
- Select only needed columns (not `*` unless required)
- Use `eq`, `gt`, `lt`, `in` for filtering
- Pagination with `range(start, end)` for large datasets
- Default max 1,000 rows per query

**Confidence:** HIGH (Supabase official docs)

### Insert/Update Patterns

**Pattern: Insert single record**
```typescript
const { data, error } = await supabase
  .from('customers')
  .insert({
    name: 'John Doe',
    email: 'john@example.com',
    status: 'active'
  })
  .select() // Returns inserted record
  .single();
```

**Pattern: Update records**
```typescript
const { data, error } = await supabase
  .from('tickets')
  .update({ status: 'closed', closed_at: new Date().toISOString() })
  .eq('id', ticketId)
  .select()
  .single();
```

**Confidence:** HIGH (Supabase API docs)

### Error Handling

**Pattern: Supabase error handling**
```typescript
const { data, error } = await supabase
  .from('customers')
  .select('*')
  .eq('id', customerId);

if (error) {
  console.error("Supabase error:", error.message, error.code);
  throw new McpError(
    ErrorCode.InternalError,
    `Database query failed: ${error.message}`
  );
}

// data is now type-safe and non-null
return data;
```

**Alternative: try/catch with rejectErrors()**
```typescript
try {
  const { data } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .rejectErrors(); // Throws instead of returning error

  return data;
} catch (error) {
  console.error("Query failed:", error);
  throw new McpError(ErrorCode.InternalError, "Failed to fetch customer");
}
```

**Best practices:**
- Always check `error` before using `data`
- Use `error.code` and `error.name` for error identification
- Log errors to stderr before re-throwing as McpError
- Never expose raw database errors to MCP client

**Confidence:** HIGH (Supabase docs + community patterns)

### Performance Optimization

**Pattern: Efficient queries**
```typescript
// ❌ Bad: N+1 query pattern
for (const ticket of tickets) {
  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', ticket.customer_id)
    .single();
}

// ✅ Good: Single query with join
const { data: tickets } = await supabase
  .from('tickets')
  .select(`
    *,
    customer:customers(*)
  `);
```

**Best practices:**
- Use joins instead of separate queries
- Add indexes on filtered/joined columns
- Use `select(columns)` not `select('*')` when possible
- Paginate with `range()` for large result sets
- Use `EXPLAIN ANALYZE` on complex queries

**Confidence:** HIGH (Supabase performance docs)

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| @modelcontextprotocol/sdk (TypeScript) | Python MCP SDK | Team prefers Python; better library ecosystem for data processing. |
| Zod v3 | Zod v4 | TypeScript SDK moves to Zod v4 in v2 (currently pre-alpha). Stick with v3 for v1.x SDK. |
| StdioServerTransport | HTTP/SSE transport | Remote server deployment; multiple concurrent clients. Stdio is standard for Claude Desktop. |
| Service role key | Anon key + RLS | When using browser client. Server-side tools SHOULD use service role for full access. |
| Biome | ESLint + Prettier | Existing ESLint config; team preference. Biome is faster and simpler. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| console.log() in stdio servers | Corrupts JSON-RPC stdout stream | console.error() (writes to stderr) |
| Service role key in client code | Bypasses RLS, grants full DB access | Anon key + RLS policies (server-side only) |
| Node.js < 16 | Not supported by MCP SDK v1.12+ | Node 16 or higher |
| Supabase v2.79+ with Node 18 | Node 18 support dropped | Use Node 20+ or Supabase < v2.79 |
| MCP SDK v2 (pre-alpha) | Not production-ready | MCP SDK v1.x (stable) |
| String-matching Supabase errors | error.message can change | error.code, error.name |
| Complex RLS policies with joins | Slow query performance | Organize policy to fetch data into array, use IN/ANY |
| auth.uid() alone in RLS | Doesn't exclude 'anon' role | Add 'authenticated' role check |

## Stack Patterns by Use Case

**Read-only analytics tool:**
- Use `.select()` with aggregations
- Service role key OK (no writes)
- Focus on query performance

**CRUD operations:**
- Use service role key (bypasses RLS)
- Validate all inputs with Zod
- Use transactions for multi-step operations

**Real-time data:**
- Consider Supabase real-time subscriptions
- May need HTTP/SSE transport instead of stdio

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| @modelcontextprotocol/sdk@1.12+ | Zod v3 | Zod v4 required in v2 (pre-alpha) |
| @supabase/supabase-js@2.49+ | Node 20+ | Node 18 dropped in v2.79.0 |
| TypeScript 5.8+ | Node16 module resolution | Use "module": "Node16" in tsconfig |

## Sources

**MCP Protocol & SDK:**
- [Build an MCP server - Model Context Protocol](https://modelcontextprotocol.io/docs/develop/build-server)
- [GitHub - modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Best Practices: Architecture & Implementation Guide](https://modelcontextprotocol.info/docs/best-practices/)
- [Implementing model context protocol (MCP): Tips, tricks and pitfalls](https://nearform.com/digital-community/implementing-model-context-protocol-mcp-tips-tricks-and-pitfalls/)
- [Error Handling in MCP Servers - Best Practices Guide](https://mcpcat.io/guides/error-handling-custom-mcp-servers/)

**Supabase:**
- [JavaScript API Reference - Select](https://supabase.com/docs/reference/javascript/select)
- [Best Practices for Supabase - Security, Scaling & Maintainability](https://www.leanware.co/insights/supabase-best-practices)
- [Row Level Security - Supabase Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Error Handling - Supabase Docs](https://supabase.com/docs/guides/functions/error-handling)
- [RLS Performance and Best Practices - Supabase Docs](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)

**Zod:**
- [Zod - TypeScript-first schema validation](https://zod.dev/)
- [Adding custom tools to an MCP server in TypeScript](https://mcpcat.io/guides/adding-custom-tools-mcp-server-typescript/)

---
*Stack research for: MCP server + Supabase CRM portfolio demo*
*Researched: 2026-02-08*
*Next: FEATURES.md, ARCHITECTURE.md, PITFALLS.md*
