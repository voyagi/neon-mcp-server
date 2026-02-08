# Phase 1: Foundation & Infrastructure - Research

**Researched:** 2026-02-08
**Domain:** MCP server infrastructure, Zod validation, Supabase connection handling, stdio logging
**Confidence:** HIGH

## Summary

This research covers the technical foundation for implementing Phase 01 of the TechStart CRM MCP server: proper logging (stderr only), input validation (Zod), schema exposure (MCP resources), and Supabase connection handling.

Key findings:
- MCP servers using stdio transport MUST use stderr for all logging to avoid corrupting JSON-RPC protocol
- Zod provides granular error customization allowing both default type errors and custom constraint messages
- MCP resources use URI-based schema with simple registration via `server.registerResource()`
- Supabase client initialization requires explicit environment validation before connection
- Schema introspection via Supabase's information_schema provides full database metadata

**Primary recommendation:** Follow the official MCP SDK patterns for resource registration, use Zod's `.strict()` schemas with custom error messages for business constraints, validate Supabase connection at startup with fail-fast behavior, and configure stderr-only logging from the start.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @modelcontextprotocol/sdk | ^1.12.1 | MCP server implementation | Official SDK from Anthropic, mature and well-documented |
| Zod | ^3.24.4 | Schema validation | TypeScript-first, zero dependencies, excellent error handling |
| @supabase/supabase-js | ^2.49.4 | Postgres client | Official Supabase SDK with full type safety |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod-validation-error | ^3.x | User-friendly error formatting | Optional - for wrapping Zod errors in cleaner messages |
| @types/node | latest | TypeScript types | Required for Node.js type safety |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zod | Joi, Yup | Zod has better TypeScript integration and zero deps |
| Supabase SDK | pg (raw Postgres) | Supabase SDK adds helpful abstractions but raw pg has less overhead |

**Installation:**
```bash
npm install @modelcontextprotocol/sdk zod @supabase/supabase-js
npm install -D @types/node
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── index.ts              # Entry point with stdio transport
├── server.ts             # Server initialization, resource/tool registration
├── lib/
│   ├── supabase.ts       # Supabase client + connection validation
│   ├── types.ts          # Shared TypeScript interfaces
│   └── validation.ts     # Zod schemas
├── resources/
│   └── schema.ts         # Database schema resource (schema://tables)
└── tools/
    └── (future phases)   # Tools will be added in later phases
```

### Pattern 1: MCP Resource Registration
**What:** Registering a resource to expose database schema via `schema://tables` URI
**When to use:** When you need to provide context to Claude about available database tables
**Example:**
```typescript
// Source: https://modelcontextprotocol.io/docs/concepts/resources
server.registerResource({
  uri: "schema://tables",
  name: "Database Schema",
  description: "Complete schema for all tables in the TechStart CRM database",
  mimeType: "application/json"
}, async () => {
  // Return schema content
  const schema = await getSchemaFromSupabase();
  return {
    contents: [{
      uri: "schema://tables",
      mimeType: "application/json",
      text: JSON.stringify(schema, null, 2)
    }]
  };
});
```

### Pattern 2: Zod Validation with Custom Error Messages
**What:** Schema validation with helpful error messages for business rules
**When to use:** Every tool input that has domain-specific constraints (enums, formats, ranges)
**Example:**
```typescript
// Source: https://zod.dev/error-customization
const CustomerStatusSchema = z.enum(['active', 'inactive', 'lead'], {
  errorMap: (issue, ctx) => {
    if (issue.code === 'invalid_enum_value') {
      return {
        message: `Invalid status '${ctx.data}'. Valid values: active, inactive, lead.`
      };
    }
    return { message: ctx.defaultError };
  }
});

// Report all errors at once using .safeParse()
const result = schema.safeParse(input);
if (!result.success) {
  const errors = result.error.errors.map(e =>
    `${e.path.join('.')}: ${e.message}`
  ).join('; ');
  throw new Error(errors);
}
```

### Pattern 3: Supabase Connection Validation at Startup
**What:** Validate environment variables and database connectivity before starting the server
**When to use:** Server initialization (index.ts or server.ts)
**Example:**
```typescript
// Validate env vars first
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  console.error('See seed/setup.md for configuration instructions.');
  process.exit(1);
}

// Test connection by querying a known table
try {
  const { error } = await supabase.from('customers').select('id').limit(1);
  if (error) throw error;
} catch (error) {
  console.error('Failed to connect to Supabase. Check your credentials and ensure the database is seeded.');
  console.error('See seed/setup.md for setup instructions.');
  process.exit(1);
}
```

### Pattern 4: Stderr-Only Logging for Stdio Transport
**What:** Use console.error() exclusively to avoid corrupting MCP protocol
**When to use:** All logging in stdio-based MCP servers
**Example:**
```typescript
// Source: https://modelcontextprotocol.io/docs/develop/build-server
// ❌ Bad - corrupts JSON-RPC protocol
console.log("Server started");

// ✅ Good - writes to stderr
console.error("TechStart CRM MCP server running on stdio");
console.error("Error:", error.message);
```

### Pattern 5: Database Schema Introspection via information_schema
**What:** Query Supabase's information_schema to get full table metadata
**When to use:** Building the `schema://tables` resource
**Example:**
```typescript
const { data: tables } = await supabase
  .from('information_schema.tables')
  .select('table_name')
  .eq('table_schema', 'public');

const { data: columns } = await supabase
  .from('information_schema.columns')
  .select('table_name, column_name, data_type, is_nullable, column_default')
  .eq('table_schema', 'public');

// Combine into structured schema
const schema = tables.map(table => ({
  name: table.table_name,
  columns: columns.filter(c => c.table_name === table.table_name)
}));
```

### Anti-Patterns to Avoid
- **Logging to stdout in stdio servers:** Will corrupt JSON-RPC messages and break the server
- **Silent connection failures:** Must validate Supabase connection at startup, not on first query
- **Stop-at-first validation:** Report all Zod errors together so Claude can fix all issues at once
- **Hardcoded credentials:** Always use environment variables, never commit secrets

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema validation | Custom validation logic | Zod | Handles type coercion, nested objects, arrays, async validation, and provides structured errors |
| User-friendly error messages | String concatenation | Zod error maps + zod-validation-error | Properly formats paths, handles i18n, prevents data leaks |
| Database schema inspection | Manual queries | information_schema standard | Cross-database compatibility, well-documented, handles all edge cases |
| Environment variable validation | if/else chains | Zod + process.env | Type-safe, validates at startup, generates types automatically |

**Key insight:** Zod's error customization system is deep - custom error maps, per-parse overrides, global config. Don't rebuild this. For database introspection, Postgres information_schema is the standard - use it via Supabase rather than querying pg_catalog directly.

## Common Pitfalls

### Pitfall 1: Logging to stdout in stdio servers
**What goes wrong:** Server becomes unresponsive, Claude Desktop shows "connection failed"
**Why it happens:** MCP uses JSON-RPC over stdio - any stdout writes corrupt the protocol stream
**How to avoid:** Use `console.error()` exclusively (writes to stderr). Never use `console.log()`, `console.info()`, `console.warn()`, or `process.stdout.write()`
**Warning signs:** Claude Desktop logs show "Parse error" or "Invalid JSON-RPC message"

### Pitfall 2: Late connection validation
**What goes wrong:** Server starts successfully but first tool call fails with cryptic database errors
**Why it happens:** Supabase client creation doesn't actually test the connection - errors surface on first query
**How to avoid:** Run a test query at server startup (e.g., `.from('customers').select('id').limit(1)`)
**Warning signs:** Server starts but first tool use shows "relation does not exist" or auth errors

### Pitfall 3: Stop-at-first Zod validation
**What goes wrong:** Claude fixes one error, resubmits, gets a different error - takes multiple rounds
**Why it happens:** Using `.parse()` throws on first error instead of collecting all issues
**How to avoid:** Always use `.safeParse()` and format `result.error.errors` array into a single message
**Warning signs:** User sees "Invalid type" error, fixes it, then sees "Missing required field" error

### Pitfall 4: Exposing Supabase URL in errors
**What goes wrong:** Error messages leak the Supabase project URL (security smell for portfolio viewers)
**Why it happens:** Default Supabase error messages include the full connection URL
**How to avoid:** Catch Supabase errors and rethrow with sanitized messages: "Connection failed. Check SUPABASE_URL environment variable."
**Warning signs:** Error logs show `https://xxxxx.supabase.co` in messages

### Pitfall 5: Missing schema relationships
**What goes wrong:** Claude writes queries that violate foreign key constraints
**Why it happens:** Schema resource only lists columns but doesn't show how tables relate
**How to avoid:** Query `information_schema.key_column_usage` for foreign keys and include in schema resource
**Warning signs:** Claude tries to create tickets with invalid customer_id values

## Code Examples

Verified patterns from official sources:

### MCP Server Initialization with Capabilities
```typescript
// Source: https://modelcontextprotocol.io/docs/develop/build-server
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({
  name: "techstart-crm",
  version: "0.1.0",
  capabilities: {
    resources: {}  // Declares resource support
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("TechStart CRM MCP server running on stdio");
```

### Zod Schema with Multiple Custom Errors
```typescript
// Source: https://zod.dev/error-customization
import { z } from 'zod';

const CreateCustomerSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  email: z.string().email("Invalid email format"),
  status: z.enum(['active', 'inactive', 'lead']).optional()
}).strict();  // Reject unknown fields

// Usage with all errors reported
const result = CreateCustomerSchema.safeParse(input);
if (!result.success) {
  const errorMessages = result.error.errors
    .map(err => `${err.path.join('.')}: ${err.message}`)
    .join('; ');
  return { error: errorMessages };
}
```

### Supabase Schema Introspection
```typescript
// Query information_schema for full schema metadata
const { data: columns, error } = await supabase
  .rpc('get_table_schema', { schema_name: 'public' });
// OR direct query:
const { data } = await supabase
  .from('information_schema.columns')
  .select(`
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
  `)
  .eq('table_schema', 'public')
  .order('table_name')
  .order('ordinal_position');
```

### Resource Registration Pattern
```typescript
// Source: https://modelcontextprotocol.io/docs/concepts/resources
server.registerResource({
  uri: "schema://tables",
  name: "Database Schema",
  description: "Full schema of TechStart CRM database tables",
  mimeType: "application/json"
}, async () => {
  const schema = await buildSchemaFromSupabase();
  return {
    contents: [{
      uri: "schema://tables",
      mimeType: "application/json",
      text: JSON.stringify(schema, null, 2)
    }]
  };
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `server.tool()` method | `server.registerTool()` | MCP SDK 1.0+ | Old method deprecated, registerTool is now standard |
| SSE transport | Stdio or Streamable HTTP | MCP SDK 1.0+ | SSE marked as deprecated legacy transport |
| Manual error formatting | Zod error maps | Zod 3.22+ | Error maps became first-class, replacing manual errorMap |

**Deprecated/outdated:**
- `server.tool()` registration method - replaced by `server.registerTool()` (still works but deprecated)
- SSE transport for MCP - use stdio (local) or Streamable HTTP (remote) instead
- Zod's `refine()` for simple constraints - use native validators like `.min()`, `.max()`, `.email()` instead

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal schema format for Claude**
   - What we know: MCP resources support JSON or text, Claude processes both
   - What's unclear: Does Claude prefer flat JSON, nested structure, or markdown table format for schema?
   - Recommendation: Use structured JSON with descriptions (most flexible for future tooling)

2. **Environment variable validation timing**
   - What we know: Need to validate before first Supabase query
   - What's unclear: Should validation happen in server.ts or supabase.ts module?
   - Recommendation: Validate in index.ts before creating server (fail-fast pattern)

3. **Error message verbosity for demo audience**
   - What we know: Upwork clients testing the demo are non-technical
   - What's unclear: Balance between helpful (verbose) vs clean (terse) error messages
   - Recommendation: Start verbose with setup pointers, can reduce later if needed

## Sources

### Primary (HIGH confidence)
- [MCP Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25) - Resources, error handling, stdio logging requirements
- [MCP Build Server Guide](https://modelcontextprotocol.io/docs/develop/build-server) - Server initialization, logging best practices, TypeScript examples
- [MCP Resources Documentation](https://modelcontextprotocol.io/docs/concepts/resources) - Resource schema, URI conventions, registration patterns
- [Zod Error Customization](https://zod.dev/error-customization) - Error maps, custom messages, safeParse patterns
- [Supabase Error Handling Guide](https://supabase.com/docs/guides/functions/error-handling) - Connection patterns, error types, logging

### Secondary (MEDIUM confidence)
- Multiple blog posts and dev.to articles from 2026 confirming stderr-only logging for stdio MCP servers
- Community examples of Supabase schema introspection via information_schema

### Tertiary (LOW confidence)
- None - all findings verified against official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries from official SDKs and well-established packages
- Architecture: HIGH - Patterns verified in official MCP documentation and SDK examples
- Pitfalls: HIGH - Documented in official MCP logging guide and Zod error handling docs

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (30 days - stable technologies)
