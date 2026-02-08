# Phase 2: Read Operations - Research

**Researched:** 2026-02-08
**Domain:** Supabase query patterns, MCP tool registration, PostgreSQL filtering
**Confidence:** HIGH

## Summary

Phase 2 implements read-only query tools for customers, tickets, and products using the Supabase JavaScript client and MCP TypeScript SDK. The standard approach uses Supabase's declarative query builder with filter chaining for conditional queries and nested select syntax for foreign key joins. MCP tools are registered using `server.registerTool()` with Zod schemas for input validation and return text content in structured format.

**Key findings:**

- Supabase's filter methods (eq, ilike, in) chain naturally after .select() for declarative query building
- Foreign key relationships are automatically detected and queried using nested select syntax: `select('ticket_field, customer_table(customer_fields)')`
- MCP tool registration pattern uses Zod schemas for input validation and returns { content: [{ type: "text", text: "..." }] }
- Case-insensitive text matching uses .ilike() with % wildcards for partial matching
- Error handling uses destructured { data, error } pattern - never throws exceptions

**Primary recommendation:** Use Supabase's built-in filter chaining with conditional application for optional parameters. Avoid string interpolation or raw SQL for filtering.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.49.4 | PostgreSQL client | Official Supabase SDK, auto-detects relationships |
| @modelcontextprotocol/sdk | ^1.12.1 | MCP server framework | Official MCP TypeScript SDK |
| zod | ^3.24.4 | Input validation | Type-safe schema validation, integrates with MCP |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| typescript | ^5.8.3 | Type checking | Already in project, ensures type safety |

### Already Implemented

Phase 1 established:
- Supabase client at `src/lib/supabase.ts` with connection validation
- Zod validation schemas in `src/lib/validation.ts` for all tool inputs
- Type definitions in `src/lib/types.ts` for database entities
- Server registration in `src/server.ts` with `createServer()` function

**Installation:** No new dependencies required - stack complete from Phase 1.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── tools/
│   ├── customers.ts     # list_customers, get_customer
│   ├── tickets.ts       # list_tickets, get_ticket
│   ├── products.ts      # list_products, search_products
│   └── analytics.ts     # get_summary
├── lib/
│   ├── supabase.ts      # [exists] Supabase client
│   ├── types.ts         # [exists] TypeScript types
│   └── validation.ts    # [exists] Zod schemas
└── server.ts            # [exists] Tool registration
```

### Pattern 1: Conditional Filter Application

**What:** Build query dynamically by conditionally applying filters based on input parameters.

**When to use:** When a tool accepts optional filter parameters (e.g., list_customers with optional status and company).

**Example:**

```typescript
// Source: https://supabase.com/docs/reference/javascript/using-filters
async function listCustomers(filters: { status?: string; company?: string }) {
  let query = supabase.from('customers').select('*');

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.company) {
    query = query.ilike('company', `%${filters.company}%`);
  }

  const { data, error } = await query;
  return { data, error };
}
```

### Pattern 2: Nested Select for Foreign Keys

**What:** Use Supabase's nested select syntax to fetch related table data in a single query.

**When to use:** When a tool needs to include foreign table fields (e.g., get_ticket with customer info).

**Example:**

```typescript
// Source: https://supabase.com/docs/guides/database/joins-and-nesting
const { data, error } = await supabase
  .from('tickets')
  .select(`
    id,
    subject,
    description,
    status,
    priority,
    created_at,
    closed_at,
    customers (
      id,
      name,
      email,
      company
    )
  `)
  .eq('id', ticketId)
  .single();
```

### Pattern 3: MCP Tool Registration

**What:** Register tools with the MCP server using `server.registerTool()` with Zod schemas.

**When to use:** For every tool exposed to Claude.

**Example:**

```typescript
// Source: https://modelcontextprotocol.io/docs/develop/build-server
import { z } from "zod";

server.registerTool(
  "list_customers",
  {
    description: "List all customers with optional filters",
    inputSchema: {
      status: z.enum(["active", "inactive", "lead"]).optional(),
      company: z.string().optional(),
    },
  },
  async ({ status, company }) => {
    // Query logic here
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ results, count }, null, 2),
        },
      ],
    };
  }
);
```

### Pattern 4: Error Handling

**What:** Always destructure { data, error } and check error before using data.

**When to use:** Every Supabase query.

**Example:**

```typescript
// Source: https://supabase.com/docs/guides/functions/error-handling
const { data, error } = await supabase.from('customers').select('*');

if (error) {
  return {
    content: [
      {
        type: "text",
        text: `Database error: ${error.message}`,
      },
    ],
  };
}

// Safe to use data here
return { content: [{ type: "text", text: JSON.stringify(data) }] };
```

### Pattern 5: Price Formatting

**What:** Return both raw cents and formatted display string for prices.

**When to use:** When returning product data with prices.

**Example:**

```typescript
const products = data.map((product) => ({
  ...product,
  price_display: `$${(product.price_cents / 100).toFixed(2)}`,
}));
```

### Anti-Patterns to Avoid

- **String interpolation in queries:** Never use template strings to build WHERE clauses - use Supabase's filter methods instead
- **Writing to stdout:** Use console.error() not console.log() in stdio transport servers - stdout corrupts JSON-RPC
- **Throwing errors in tools:** Return error content instead of throwing - MCP expects structured responses
- **Fetching related data separately:** Use nested select syntax instead of multiple queries

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SQL query builder | String concatenation for WHERE clauses | Supabase's .eq(), .ilike(), .in() methods | Prevents SQL injection, handles escaping, type-safe |
| JSON schema validation | Manual type checking with if/typeof | Zod schemas | Type inference, error messages, integration with MCP SDK |
| Foreign key joins | Separate queries + manual joining | Supabase nested select syntax | Single query, automatic relationship detection, cleaner code |
| Case-insensitive search | LOWER() wrapper functions | .ilike() filter method | Built-in, optimized, readable |

**Key insight:** Supabase's query builder is declarative and composable - chaining filters is cleaner and safer than building SQL strings.

## Common Pitfalls

### Pitfall 1: Forgetting .single() for Single-Row Results

**What goes wrong:** Querying by ID returns an array with one item instead of the object directly, requiring data[0] everywhere.

**Why it happens:** Supabase's .select() always returns an array by default.

**How to avoid:** Add .single() after .eq('id', value) when you expect exactly one result.

**Warning signs:** TypeScript errors about "data[0] might be undefined" or runtime errors accessing properties.

```typescript
// ❌ Returns array
const { data } = await supabase.from('customers').select('*').eq('id', id);
// data is Customer[] | null

// ✅ Returns single object
const { data } = await supabase.from('customers').select('*').eq('id', id).single();
// data is Customer | null
```

### Pitfall 2: Not Handling Null Foreign Keys

**What goes wrong:** Nested select returns null for the foreign table when the foreign key is null, causing "Cannot read property of null" errors.

**Why it happens:** PostgreSQL joins return null for missing relationships.

**How to avoid:** Check if the nested object exists before accessing properties, or handle null in the response formatting.

**Warning signs:** Runtime errors when a ticket has no customer (orphaned data), or inconsistent response shapes.

```typescript
// ❌ Will crash if customer_id is null
const customerName = ticket.customers.name;

// ✅ Safe access
const customerName = ticket.customers?.name || "Unknown Customer";
```

### Pitfall 3: Using LIKE Instead of ILIKE

**What goes wrong:** Case-sensitive matching fails to find results when user types "acme" but database has "Acme Corp".

**Why it happens:** PostgreSQL's LIKE is case-sensitive by default.

**How to avoid:** Always use .ilike() for text search, not .like().

**Warning signs:** User reports "can't find X" when you can see it in the database with different casing.

```typescript
// ❌ Case-sensitive, misses "Acme Corp"
.like('company', '%acme%')

// ✅ Case-insensitive, finds "Acme Corp", "ACME", "acme"
.ilike('company', '%acme%')
```

### Pitfall 4: Writing to stdout in MCP Servers

**What goes wrong:** Server appears to connect but Claude doesn't receive responses, or connection drops randomly.

**Why it happens:** MCP uses stdio transport - stdout is the JSON-RPC message channel. console.log() corrupts it.

**How to avoid:** Use console.error() for logging in stdio servers. Only use console.log() in HTTP servers.

**Warning signs:** Server connects successfully but tool calls never complete, or "invalid JSON-RPC" errors in logs.

```typescript
// ❌ Corrupts stdio transport
console.log("Executing tool:", toolName);

// ✅ Logs to stderr, safe for stdio
console.error("Executing tool:", toolName);
```

### Pitfall 5: Not Ordering Results

**What goes wrong:** Results appear in random order, confusing users when they query the same data multiple times.

**Why it happens:** PostgreSQL returns rows in arbitrary order unless ORDER BY is specified.

**How to avoid:** Always add .order() to list queries with a sensible column (created_at desc, name asc, etc.).

**Warning signs:** Same query returns different order each time, hard to find specific items.

```typescript
// ❌ Random order
const { data } = await supabase.from('customers').select('*');

// ✅ Consistent alphabetical order
const { data } = await supabase.from('customers').select('*').order('name', { ascending: true });
```

## Code Examples

Verified patterns from official sources:

### List Query with Optional Filters

```typescript
// Source: https://supabase.com/docs/reference/javascript/using-filters
async function listTickets(filters: {
  status?: string;
  customer_id?: string;
  priority?: string;
}) {
  let query = supabase
    .from('tickets')
    .select('*, customers(name)')
    .order('created_at', { ascending: false });

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.customer_id) {
    query = query.eq('customer_id', filters.customer_id);
  }

  if (filters.priority) {
    query = query.eq('priority', filters.priority);
  }

  const { data, error } = await query;

  if (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            results: data,
            count: data.length,
          },
          null,
          2
        ),
      },
    ],
  };
}
```

### Single Record with Foreign Data

```typescript
// Source: https://supabase.com/docs/guides/database/joins-and-nesting
async function getTicket(id: string) {
  const { data, error } = await supabase
    .from('tickets')
    .select(`
      *,
      customers (
        id,
        name,
        email,
        company
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
    };
  }

  if (!data) {
    return {
      content: [{ type: "text", text: `Ticket not found: ${id}` }],
    };
  }

  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}
```

### Case-Insensitive Search

```typescript
// Source: https://www.commandprompt.com/education/ilike-operator-case-insensitive-pattern-matching-in-postgresql/
async function searchProducts(query: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .or(`name.ilike.%${query}%,category.ilike.%${query}%,description.ilike.%${query}%`)
    .order('name', { ascending: true });

  if (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            results: data,
            count: data.length,
            message: data.length === 0 ? `No products match "${query}"` : undefined,
          },
          null,
          2
        ),
      },
    ],
  };
}
```

### Aggregate Query with Count

```typescript
// Source: Project context decisions
async function getCustomerWithStats(id: string) {
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single();

  if (customerError) {
    return {
      content: [{ type: "text", text: `Error: ${customerError.message}` }],
    };
  }

  const { data: tickets, error: ticketsError } = await supabase
    .from('tickets')
    .select('id, subject, status, created_at')
    .eq('customer_id', id)
    .order('created_at', { ascending: false })
    .limit(3);

  if (ticketsError) {
    return {
      content: [{ type: "text", text: `Error: ${ticketsError.message}` }],
    };
  }

  const { count: totalTickets } = await supabase
    .from('tickets')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', id);

  const { count: openTickets } = await supabase
    .from('tickets')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', id)
    .neq('status', 'closed');

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            ...customer,
            open_tickets_count: openTickets || 0,
            total_tickets_count: totalTickets || 0,
            recent_tickets: tickets || [],
          },
          null,
          2
        ),
      },
    ],
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual SQL joins | Nested select syntax | Supabase v1.0+ | Cleaner code, auto-detects relationships |
| .then() chains | async/await | ES2017+ | More readable async code |
| Manual JSON parsing | Automatic JSON handling | Supabase built-in | No manual parsing needed |
| String interpolation | Filter methods | Always recommended | Prevents SQL injection |

**Deprecated/outdated:**

- `supabase.rpc()` for simple queries: Use .select() with filters instead - only use RPC for complex stored procedures
- `.limit(1)` for single records: Use .single() which returns object not array and throws if 0 or 2+ results

## Open Questions

1. **Should list_tickets accept customer_name in addition to customer_id?**
   - What we know: Context says "server resolves name to ID internally"
   - What's unclear: Best pattern for name-to-ID resolution - separate query or EXISTS subquery?
   - Recommendation: Use two-step query (first resolve name to ID, then use ID in main query) for clarity

2. **How to handle customer_name OR customer_id parameter?**
   - What we know: User can pass either identifier type
   - What's unclear: Should we validate mutual exclusivity or allow both?
   - Recommendation: Accept both, prioritize customer_id if both present, document in tool description

3. **Should empty result messages be different per entity type?**
   - What we know: Context says include "No customers match..." message
   - What's unclear: Generic vs specific messages ("No results" vs "No active tickets found")
   - Recommendation: Use specific messages mentioning entity type and active filters

## Sources

### Primary (HIGH confidence)

- [Supabase JavaScript Using Filters](https://supabase.com/docs/reference/javascript/using-filters) - Filter methods and chaining
- [Supabase Joins and Nesting](https://supabase.com/docs/guides/database/joins-and-nesting) - Foreign key relationships
- [Supabase JavaScript Select](https://supabase.com/docs/reference/javascript/select) - Query syntax and ordering
- [Model Context Protocol Build Server](https://modelcontextprotocol.io/docs/develop/build-server) - Tool registration pattern
- [Supabase Error Handling](https://supabase.com/docs/guides/functions/error-handling) - Error handling pattern

### Secondary (MEDIUM confidence)

- [CommandPrompt ILIKE Operator](https://www.commandprompt.com/education/ilike-operator-case-insensitive-pattern-matching-in-postgresql/) - Case-insensitive matching
- [MCP Security Best Practices](https://www.akto.io/blog/mcp-security-best-practices) - Input validation patterns
- [Supabase TypeScript Guide](https://supalaunch.com/blog/supabase-typescript-guide) - Type safety patterns

### Tertiary (LOW confidence)

- None - all critical findings verified with official sources

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Official SDKs, already in package.json
- Architecture: HIGH - Patterns from official Supabase and MCP documentation
- Pitfalls: HIGH - Common issues documented in official guides and community

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (30 days - stable ecosystem)
