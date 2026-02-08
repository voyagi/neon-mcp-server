# Phase 3: Write Operations & Analytics - Research

**Researched:** 2026-02-08
**Domain:** Supabase insert/update operations, PostgreSQL constraint handling, aggregate analytics patterns
**Confidence:** HIGH

## Summary

Phase 3 implements write operations (create/update customers, create/close tickets) and analytics queries using Supabase's declarative insert/update methods with comprehensive error handling for constraint violations. The standard approach uses `.insert()` and `.update()` with `.select()` chaining to return created/modified records, explicit PostgreSQL error code checking (23505 for unique constraints) for actionable error messages, and multiple count queries with `{ count: 'exact', head: true }` for dashboard analytics.

**Key findings:**

- Insert/update operations don't return data by default - must chain `.select()` to get created/updated records with generated fields (id, created_at)
- PostgreSQL unique constraint violations return error code '23505' with constraint name in error.details - check error.code to provide clear feedback like "A customer with email X already exists"
- Partial updates are implicit - pass only fields to change in the update object, Supabase applies them atomically
- Dashboard aggregates require multiple count queries since JavaScript SDK doesn't support GROUP BY - use `{ count: 'exact', head: true }` for count-only queries, or manual SUM calculation across result sets
- Two-step customer validation pattern from Phase 2 applies to create_ticket - resolve customer_name to ID first, then validate existence before insert

**Primary recommendation:** Use `.insert().select()` and `.update().select()` for all write operations to return full record state. Check `error.code === '23505'` for duplicate detection and craft user-friendly messages from error.details constraint information.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.49.4 | PostgreSQL client | Official SDK, handles insert/update with error codes |
| zod | ^3.24.4 | Input validation | .strict() prevents extra fields, custom errorMaps for enums |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pg-error-constants | Latest | Error code constants | OPTIONAL - cleaner than '23505' strings, but not required |

### Already Implemented

Phase 1-2 established:
- Supabase client with connection validation
- Zod validation schemas with .strict() for create/update operations (validation.ts)
- Customer name resolution pattern (two-step query: resolve ID, then filter)
- Price formatting helper function pattern (formatProduct with price_display)

**Installation:** No new dependencies required. Optional: `npm install pg-error-constants` for error code readability.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── tools/
│   ├── customers.ts     # [extend] + create_customer, update_customer
│   ├── tickets.ts       # [extend] + create_ticket, close_ticket
│   ├── analytics.ts     # [new] get_summary with multiple counts
│   └── products.ts      # [exists] formatProduct helper
├── lib/
│   └── validation.ts    # [extend] + schemas for write tools
seed/
└── seed.sql             # [extend] + ALTER TABLE for resolution column
```

### Pattern 1: Insert with Select Return

**What:** Chain `.select()` after `.insert()` to return the full created record including generated fields.

**When to use:** All create operations that need to return the created record to the user.

**Example:**

```typescript
// Source: https://supabase.com/docs/reference/javascript/insert
const { data, error } = await supabase
  .from('customers')
  .insert({
    name: 'Alice Johnson',
    email: 'alice@example.com',
    company: 'Acme Corp',
    status: 'active'
  })
  .select();

if (error) {
  // Handle constraint violations (see Pattern 3)
  return errorResponse;
}

// data[0] contains full record: id, name, email, company, status, created_at
return {
  content: [{ type: "text", text: JSON.stringify(data[0], null, 2) }]
};
```

### Pattern 2: Partial Update with Select Return

**What:** Pass only fields to change in `.update()` object, chain `.select()` for current state.

**When to use:** Update operations where some fields are optional or unchanged.

**Example:**

```typescript
// Source: https://supabase.com/docs/reference/javascript/update
const { data, error } = await supabase
  .from('customers')
  .update({ status: 'inactive' })  // Only updating status
  .eq('id', customerId)
  .select();

if (error || !data || data.length === 0) {
  return { content: [{ type: "text", text: `Customer not found: ${customerId}` }] };
}

// data[0] contains complete updated record
return {
  content: [{ type: "text", text: JSON.stringify(data[0], null, 2) }]
};
```

### Pattern 3: Unique Constraint Violation Detection

**What:** Check `error.code === '23505'` to detect duplicate email/unique constraint violations and provide actionable error messages.

**When to use:** Create/update operations on tables with unique constraints (customers.email).

**Example:**

```typescript
// Source: https://www.postgresql.org/docs/current/errcodes-appendix.html
const { data, error } = await supabase
  .from('customers')
  .insert({ name, email, company, status })
  .select();

if (error) {
  // PostgreSQL error code 23505 = unique_violation
  if (error.code === '23505') {
    return {
      content: [{
        type: "text",
        text: `A customer with email "${email}" already exists`
      }]
    };
  }

  // Other database errors
  return {
    content: [{ type: "text", text: `Database error: ${error.message}` }]
  };
}

return {
  content: [{ type: "text", text: JSON.stringify(data[0], null, 2) }]
};
```

### Pattern 4: Two-Step Customer Validation for Tickets

**What:** Reuse Phase 2's customer name resolution pattern, but validate customer_id exists before insert.

**When to use:** create_ticket with either customer_id or customer_name parameter.

**Example:**

```typescript
// Source: Established in Phase 2 (tickets.ts list_tickets)
let finalCustomerId = customer_id;

// If customer_name provided (and no customer_id), resolve it
if (customer_name && !customer_id) {
  const { data: matches } = await supabase
    .from('customers')
    .select('id, name')
    .ilike('name', `%${customer_name}%`);

  if (!matches || matches.length === 0) {
    return {
      content: [{
        type: "text",
        text: `No customer found matching "${customer_name}"`
      }]
    };
  }

  if (matches.length > 1) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          error: "Multiple customers match this name. Please specify customer_id.",
          matches: matches.map(m => ({ id: m.id, name: m.name }))
        }, null, 2)
      }]
    };
  }

  finalCustomerId = matches[0].id;
}

// Validate customer exists (handles direct customer_id case)
const { data: customer } = await supabase
  .from('customers')
  .select('id')
  .eq('id', finalCustomerId)
  .single();

if (!customer) {
  return {
    content: [{
      type: "text",
      text: `Customer not found: ${finalCustomerId}`
    }]
  };
}

// Now safe to insert ticket
const { data, error } = await supabase
  .from('tickets')
  .insert({ customer_id: finalCustomerId, subject, description, priority })
  .select();
```

### Pattern 5: Close Ticket with Timestamp and Validation

**What:** Update ticket status to 'closed' and set closed_at timestamp, but prevent re-closing.

**When to use:** close_ticket operation.

**Example:**

```typescript
// First check current status
const { data: existing } = await supabase
  .from('tickets')
  .select('status, closed_at')
  .eq('id', ticketId)
  .single();

if (!existing) {
  return {
    content: [{ type: "text", text: `Ticket not found: ${ticketId}` }]
  };
}

if (existing.status === 'closed') {
  return {
    content: [{
      type: "text",
      text: `Ticket ${ticketId} is already closed (closed on ${existing.closed_at})`
    }]
  };
}

// Close the ticket with timestamp
const { data, error } = await supabase
  .from('tickets')
  .update({
    status: 'closed',
    closed_at: new Date().toISOString(),  // Use ISO string for timestamptz
    resolution: resolution_note || null
  })
  .eq('id', ticketId)
  .select();

if (error) {
  return {
    content: [{ type: "text", text: `Database error: ${error.message}` }]
  };
}

return {
  content: [{ type: "text", text: JSON.stringify(data[0], null, 2) }]
};
```

### Pattern 6: Multiple Count Queries for Dashboard

**What:** Execute separate count queries for each metric using `{ count: 'exact', head: true }`.

**When to use:** Analytics dashboard that needs counts by category/status (no GROUP BY in JS SDK).

**Example:**

```typescript
// Source: https://supabase.com/docs/reference/javascript/select (count parameter)
// Customer counts by status (3 queries)
const { count: activeCount } = await supabase
  .from('customers')
  .select('id', { count: 'exact', head: true })
  .eq('status', 'active');

const { count: inactiveCount } = await supabase
  .from('customers')
  .select('id', { count: 'exact', head: true })
  .eq('status', 'inactive');

const { count: leadCount } = await supabase
  .from('customers')
  .select('id', { count: 'exact', head: true })
  .eq('status', 'lead');

// Ticket open vs closed (2 queries)
const { count: openTickets } = await supabase
  .from('tickets')
  .select('id', { count: 'exact', head: true })
  .neq('status', 'closed');

const { count: closedTickets } = await supabase
  .from('tickets')
  .select('id', { count: 'exact', head: true })
  .eq('status', 'closed');

// Product catalog value (1 query + manual sum)
const { data: products } = await supabase
  .from('products')
  .select('price_cents, category');

const totalValue = products.reduce((sum, p) => sum + p.price_cents, 0);
const categoryBreakdown = products.reduce((acc, p) => {
  acc[p.category] = (acc[p.category] || 0) + p.price_cents;
  return acc;
}, {});

// Format response
const summary = {
  customers: {
    active: activeCount ?? 0,
    inactive: inactiveCount ?? 0,
    leads: leadCount ?? 0,
    total: (activeCount ?? 0) + (inactiveCount ?? 0) + (leadCount ?? 0)
  },
  tickets: {
    open: openTickets ?? 0,
    closed: closedTickets ?? 0,
    total: (openTickets ?? 0) + (closedTickets ?? 0)
  },
  products: {
    total_value: `$${(totalValue / 100).toFixed(2)}`,
    by_category: Object.entries(categoryBreakdown).map(([cat, cents]) => ({
      category: cat,
      value: `$${((cents as number) / 100).toFixed(2)}`
    }))
  }
};
```

### Pattern 7: Price Formatting Helper (Reuse from Phase 2)

**What:** DRY helper function to add computed price_display field to products.

**When to use:** Any response that includes product pricing or currency values.

**Example:**

```typescript
// Source: src/tools/products.ts (Phase 2 implementation)
function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// Apply to analytics summary
const summary = {
  products: {
    total_value: formatPrice(totalValue),
    by_category: categoryBreakdown.map(item => ({
      ...item,
      value: formatPrice(item.cents)
    }))
  }
};
```

### Anti-Patterns to Avoid

- **Assuming insert/update returns data by default:** Always chain `.select()` or you'll get null data even on success
- **Generic "database error" messages for constraint violations:** Check error.code to provide actionable feedback (e.g., "email already exists")
- **Updating without checking current state for idempotent operations:** For close_ticket, check if already closed to prevent confusion
- **Using raw SQL or string interpolation for timestamps:** Use `new Date().toISOString()` for timestamptz columns, PostgreSQL handles conversion
- **Trying to use GROUP BY in JavaScript SDK:** Supabase-js doesn't support it - use multiple count queries or create PostgreSQL views
- **Not validating foreign key existence before insert:** PostgreSQL returns cryptic FK violation errors - validate explicitly for better UX

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Checking for duplicate records | Manual SELECT then INSERT logic | Check error.code === '23505' after insert | Race conditions between check and insert; PostgreSQL guarantees atomicity |
| Timestamp for "now" | JavaScript Date construction with timezone math | `new Date().toISOString()` or server-side `now()` default | Timezone inconsistencies, server time is source of truth |
| Aggregate queries with grouping | Manual array reduce after fetching all data | Multiple count queries or PostgreSQL views | Performance issues with large datasets, database is optimized for aggregates |
| Customer name lookup | Case-sensitive LIKE | `.ilike()` with wildcards | Already established in Phase 2, case-insensitive UX is better |
| Price formatting | Inline division math | Reuse formatPrice helper | DRY principle, consistent decimal handling |

**Key insight:** PostgreSQL constraint violations are features, not bugs. Use error codes to provide smart error messages instead of defensive SELECT-before-INSERT patterns that introduce race conditions.

## Common Pitfalls

### Pitfall 1: Missing .select() After Insert/Update

**What goes wrong:** Insert/update succeeds but data is null, code assumes failure.

**Why it happens:** Supabase's default behavior is to not return modified rows (performance optimization).

**How to avoid:** Always chain `.select()` after `.insert()`, `.update()`, or `.upsert()` when you need the result.

**Warning signs:**
- `if (!data)` branches execute after successful writes
- Tests show data in database but tool returns null
- Need to do separate SELECT query immediately after write

### Pitfall 2: Incomplete Unique Constraint Error Handling

**What goes wrong:** Duplicate email insert returns "duplicate key violates unique constraint customers_email_key" raw error to user.

**Why it happens:** Not checking error.code === '23505' specifically.

**How to avoid:** Wrap insert in error handler that checks error.code and extracts meaningful info from error.details or error.message.

**Warning signs:**
- Users see raw PostgreSQL error messages
- Bug reports mention "constraint" or "violates"
- No specific handling for duplicate data

### Pitfall 3: Race Condition in Check-Then-Insert

**What goes wrong:** Two concurrent requests both check "email doesn't exist", both insert, second one fails.

**Why it happens:** Defensive SELECT-before-INSERT pattern introduces time gap.

**How to avoid:** Insert first, handle 23505 error. PostgreSQL's unique constraint is atomic.

**Warning signs:**
- SELECT query before every INSERT
- "Preventing duplicates" logic in application code
- Intermittent duplicate key errors under load

### Pitfall 4: Forgetting to Validate Already-Closed Status

**What goes wrong:** close_ticket on already-closed ticket overwrites closed_at timestamp, loses original close time.

**Why it happens:** Not checking current status before update.

**How to avoid:** SELECT current status first, return friendly error if already closed with original timestamp.

**Warning signs:**
- closed_at timestamps change when ticket closed multiple times
- No idempotency in close operation
- Users confused about when ticket was actually closed

### Pitfall 5: Not Handling Multiple Name Matches

**What goes wrong:** create_ticket with customer_name="John" picks first match when there are 3 Johns.

**Why it happens:** Resolving name to ID without checking for multiple matches.

**How to avoid:** After name resolution, check if matches.length > 1, return error with list of matches.

**Warning signs:**
- Tickets attached to wrong customer
- Users need to use exact full names
- Support questions about "why did it pick that customer?"

### Pitfall 6: Forgetting Schema Migration for Resolution Column

**What goes wrong:** close_ticket tries to set resolution but column doesn't exist, database error.

**Why it happens:** Code implements resolution parameter but database schema not updated.

**How to avoid:** Add `ALTER TABLE tickets ADD COLUMN resolution text;` before implementing close_ticket.

**Warning signs:**
- "column does not exist" errors in production
- Works locally but fails in Supabase
- Missing seed.sql updates

### Pitfall 7: Using Multiple Parallel Count Queries Without Error Handling

**What goes wrong:** One count query fails (e.g., RLS policy issue), entire dashboard breaks.

**Why it happens:** Not checking error on each individual count query.

**How to avoid:** Check error after each count, provide partial results or defaults (0) if one fails.

**Warning signs:**
- Dashboard all-or-nothing (works or completely fails)
- One table permission issue breaks entire summary
- No graceful degradation

## Code Examples

Verified patterns from official sources:

### Complete Create Customer Implementation

```typescript
// Source: https://supabase.com/docs/reference/javascript/insert
async function createCustomer(args: {
  name: string;
  email: string;
  company?: string;
  status?: 'active' | 'inactive' | 'lead';
}) {
  const { name, email, company, status } = args;

  const { data, error } = await supabase
    .from('customers')
    .insert({
      name,
      email,
      company: company || null,
      status: status || 'active'  // Default to active
    })
    .select();

  if (error) {
    // Check for unique constraint violation
    if (error.code === '23505') {
      return {
        content: [{
          type: "text",
          text: `A customer with email "${email}" already exists`
        }]
      };
    }

    // Other errors
    return {
      content: [{
        type: "text",
        text: `Database error: ${error.message}`
      }]
    };
  }

  // Return full created record
  return {
    content: [{
      type: "text",
      text: JSON.stringify(data[0], null, 2)
    }]
  };
}
```

### Complete Update Customer Implementation

```typescript
// Source: https://supabase.com/docs/reference/javascript/update
async function updateCustomer(args: {
  id: string;
  name?: string;
  email?: string;
  company?: string;
  status?: 'active' | 'inactive' | 'lead';
}) {
  const { id, name, email, company, status } = args;

  // Build update object with only provided fields
  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (company !== undefined) updates.company = company;
  if (status !== undefined) updates.status = status;

  const { data, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', id)
    .select();

  if (error) {
    // Check for unique constraint (email change conflict)
    if (error.code === '23505') {
      return {
        content: [{
          type: "text",
          text: `Email "${email}" is already taken by another customer`
        }]
      };
    }

    return {
      content: [{
        type: "text",
        text: `Database error: ${error.message}`
      }]
    };
  }

  if (!data || data.length === 0) {
    return {
      content: [{
        type: "text",
        text: `Customer not found: ${id}`
      }]
    };
  }

  return {
    content: [{
      type: "text",
      text: JSON.stringify(data[0], null, 2)
    }]
  };
}
```

### Complete Dashboard Summary Implementation

```typescript
// Source: https://supabase.com/docs/reference/javascript/select (count parameter)
async function getSummary() {
  // Customer counts by status (parallel queries)
  const [
    { count: activeCount },
    { count: inactiveCount },
    { count: leadCount }
  ] = await Promise.all([
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('status', 'inactive'),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('status', 'lead')
  ]);

  // Ticket counts by status
  const [
    { count: openTickets },
    { count: closedTickets }
  ] = await Promise.all([
    supabase.from('tickets').select('id', { count: 'exact', head: true }).neq('status', 'closed'),
    supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'closed')
  ]);

  // Ticket priority breakdown
  const [
    { count: urgentCount },
    { count: highCount },
    { count: mediumCount },
    { count: lowCount }
  ] = await Promise.all([
    supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('priority', 'urgent').neq('status', 'closed'),
    supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('priority', 'high').neq('status', 'closed'),
    supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('priority', 'medium').neq('status', 'closed'),
    supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('priority', 'low').neq('status', 'closed')
  ]);

  // Product catalog value
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('price_cents, category');

  if (productsError) {
    return {
      content: [{
        type: "text",
        text: `Database error: ${productsError.message}`
      }]
    };
  }

  const totalValue = products.reduce((sum, p) => sum + p.price_cents, 0);

  // Category breakdown
  const categoryTotals: Record<string, number> = {};
  for (const product of products) {
    categoryTotals[product.category] = (categoryTotals[product.category] || 0) + product.price_cents;
  }

  const summary = {
    customers: {
      active: activeCount ?? 0,
      inactive: inactiveCount ?? 0,
      leads: leadCount ?? 0,
      total: (activeCount ?? 0) + (inactiveCount ?? 0) + (leadCount ?? 0)
    },
    tickets: {
      open: openTickets ?? 0,
      closed: closedTickets ?? 0,
      total: (openTickets ?? 0) + (closedTickets ?? 0),
      by_priority: {
        urgent: urgentCount ?? 0,
        high: highCount ?? 0,
        medium: mediumCount ?? 0,
        low: lowCount ?? 0
      }
    },
    products: {
      total_value: `$${(totalValue / 100).toFixed(2)}`,
      by_category: Object.entries(categoryTotals).map(([category, cents]) => ({
        category,
        value: `$${(cents / 100).toFixed(2)}`
      }))
    }
  };

  return {
    content: [{
      type: "text",
      text: JSON.stringify(summary, null, 2)
    }]
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual GROUP BY in app code | Multiple count queries with head: true | Supabase SDK design | Clearer separation: DB for counts, app for formatting |
| Check-then-insert to prevent duplicates | Insert-then-check-error-code | PostgreSQL ACID properties | Eliminates race conditions, trusts DB constraints |
| Returning error codes to user | Mapping error codes to user-friendly messages | MCP best practices (Jan 2026) | Better UX, LLM can understand and recover from errors |
| Using now() in SQL defaults | Passing ISO timestamp from app | Modern API design | Explicit control over timestamps, easier testing |

**Deprecated/outdated:**

- **SELECT before INSERT for duplicate prevention:** PostgreSQL unique constraints are atomic - insert first, handle 23505 error
- **Using .upsert() for simple creates:** Upsert is for "create or update" scenarios - for pure creates, `.insert()` with error handling is clearer
- **Generic error messages:** MCP error handling best practices (2026) emphasize actionable, specific error messages for LLM recovery

## Open Questions

Things that couldn't be fully resolved:

1. **Should we add resolution column via ALTER TABLE or updated seed.sql?**
   - What we know: ALTER TABLE ADD COLUMN with nullable text is safe (no locks, no rewrite)
   - What's unclear: Project convention for schema changes (migration vs seed file update)
   - Recommendation: Add ALTER TABLE in seed/schema-updates.sql for production safety, update seed.sql CREATE TABLE for fresh setups

2. **What's the best batching strategy for 10+ count queries in dashboard?**
   - What we know: Promise.all works for parallel execution, reduces latency
   - What's unclear: Supabase connection pool limits, rate limiting on concurrent queries
   - Recommendation: Use Promise.all for parallel execution (shown in examples), add error handling per query

3. **Should we create a PostgreSQL view for summary stats instead of multiple queries?**
   - What we know: Views can encapsulate GROUP BY logic that JavaScript SDK doesn't support
   - What's unclear: Project's database access philosophy (client-only vs views/functions)
   - Recommendation: Start with multiple count queries (simpler, no DB schema changes), mention views as optimization in comments

4. **How to handle "this week" filtering for recent activity?**
   - What we know: PostgreSQL has date functions like date_trunc('week', created_at)
   - What's unclear: Definition of "this week" (Sunday start? Monday? UTC timezone?)
   - Recommendation: Use simple ">= 7 days ago" filter: `.gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())` for clarity

## Sources

### Primary (HIGH confidence)

- [Supabase JavaScript Insert Reference](https://supabase.com/docs/reference/javascript/insert) - Insert syntax, .select() chaining
- [Supabase JavaScript Update Reference](https://supabase.com/docs/reference/javascript/update) - Update syntax, filter requirements
- [Supabase JavaScript Select Reference](https://supabase.com/docs/reference/javascript/select) - Count parameter, head: true for count-only
- [PostgREST Aggregate Functions](https://supabase.com/blog/postgrest-aggregate-functions) - Aggregate patterns, GROUP BY limitations
- [PostgreSQL Error Codes Appendix](https://www.postgresql.org/docs/current/errcodes-appendix.html) - Error code 23505 (unique_violation)
- [PostgreSQL NOW() Function](https://neon.com/postgresql/postgresql-date-functions/postgresql-now) - Timestamp handling
- Phase 2 research - Established patterns (name resolution, formatProduct helper, nested selects)

### Secondary (MEDIUM confidence)

- [MCP Error Handling Best Practices](https://medium.com/@sureshddm/mcp-error-handling-dont-let-your-tools-fail-silently-1b5e02fabe4c) - Verified with official MCP spec
- [Error Handling in MCP Servers Guide](https://mcpcat.io/guides/error-handling-custom-mcp-servers/) - Community best practices aligned with official docs
- [Better MCP Tool Call Error Responses](https://alpic.ai/blog/better-mcp-tool-call-error-responses-ai-recover-gracefully) - Actionable error message patterns
- [PostgreSQL ALTER TABLE Best Practices](https://medium.com/miro-engineering/sql-migrations-in-postgresql-part-1-bc38ec1cbe75) - Safe migration strategies
- [Zero-downtime Postgres Migrations](https://gocardless.com/blog/zero-downtime-postgres-migrations-the-hard-parts/) - Lock management, volatile defaults

### Tertiary (LOW confidence)

- [Supabase insert if not exists guide](https://www.restack.io/docs/supabase-knowledge-supabase-insert-if-not-exists) - Community patterns, not official
- [Can I use Supabase for analytics?](https://www.tinybird.co/blog/can-i-use-supabase-for-user-facing-analytics) - Third-party analysis of Supabase limitations

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All libraries already in project from Phase 1, no new dependencies
- Architecture: HIGH - Patterns verified with official Supabase docs, error codes from PostgreSQL docs
- Pitfalls: HIGH - Common mistakes well-documented in Supabase community and PostgreSQL migration guides
- Analytics approach: MEDIUM - Multiple count queries are established workaround, but "best" approach (views vs app logic) is project-dependent

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (30 days - Supabase is stable, PostgreSQL patterns are mature)
