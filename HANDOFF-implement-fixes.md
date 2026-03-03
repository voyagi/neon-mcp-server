# Handoff: Implement Challenge Review Fixes

## Goal

Implement all code fixes from the original challenge review, incorporating corrections from a second challenge review that found 5 HIGH issues in the plan itself. No code changes made yet.

## Branch

`chore/fix-migration-paths` (current). Create `fix/challenge-review-findings` before starting.

## Artifacts to Read

- `.claude/reviews/2026-03-01-challenge.json` - original review findings
- `.claude/reviews/2026-03-01-challenge-plan.json` - plan review findings (this session)
- `.claude/reviews/2026-03-01-challenge-tests.ts` - generated test cases (adapt, don't copy verbatim)

## What to Implement

### HIGH - 5 code fixes

**1. data[0] guards** (2 locations, not 3 - see note)

- `src/tools/customers.ts:156` - `create_customer`: add before `return jsonResponse(data[0])`:
  ```ts
  if (!data || data.length === 0) {
    return textResponse("Customer created but could not be retrieved");
  }
  ```
- `src/tools/tickets.ts:154` - `create_ticket`: same pattern with "Ticket created but..."
- **SKIP close_ticket here** - it's fully handled by the TOCTOU rewrite below

**2. PostgREST sanitization** - `src/lib/validation.ts:30`

Change regex to: `return value.replace(/[,.()]/g, "");`

**EXISTING TEST BREAKS**: `tests/validation.test.ts:86` asserts `sanitizeFilterValue("test,id.eq.secret")` returns `"testid.eq.secret"`. Update assertion to `"testideqsecret"`.

**3. Error discrimination in get_ticket** - `src/tools/tickets.ts:101-103`

Add import: `import { PGRST_NOT_FOUND } from "../lib/errors.js";`

Replace:
```ts
if (error || !data) {
  return notFoundResponse("Ticket", id);
}
```
With:
```ts
if (error) {
  if (error.code === PGRST_NOT_FOUND) {
    return notFoundResponse("Ticket", id);
  }
  return dbErrorResponse(error);
}
if (!data) {
  return notFoundResponse("Ticket", id);
}
```

### MEDIUM - 5 code fixes

**4. Promise.allSettled for get_summary** - `src/tools/analytics.ts:120-151`

Replace the entire `get_summary` handler body with Promise.allSettled. Complete code (no placeholders):

```ts
async () => {
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const results = await Promise.allSettled([
    fetchCustomerCounts(),
    fetchTicketCounts(),
    fetchProductStats(),
    fetchRecentActivity(sevenDaysAgo),
  ]);

  const [customers, tickets, products, recentActivity] = results;

  const summary: Record<string, unknown> = {};
  const errors: string[] = [];

  if (customers.status === "fulfilled") summary.customers = customers.value;
  else errors.push(`customers: ${customers.reason}`);

  if (tickets.status === "fulfilled") summary.tickets = tickets.value;
  else errors.push(`tickets: ${tickets.reason}`);

  if (products.status === "fulfilled") summary.products = products.value;
  else errors.push(`products: ${products.reason}`);

  if (recentActivity.status === "fulfilled") summary.recent_activity = recentActivity.value;
  else errors.push(`recent_activity: ${recentActivity.reason}`);

  if (Object.keys(summary).length === 0) {
    return textResponse(`Error fetching summary: ${errors.join("; ")}`);
  }

  if (errors.length > 0) summary.errors = errors;
  return jsonResponse(summary);
}
```

Key detail: when ALL four fail, return `textResponse` (backwards compatible). When some succeed, return `jsonResponse` with partial data + errors array.

**EXISTING TEST IMPACT**: `tests/analytics.test.ts:111` ("handles query errors gracefully") still passes because all-fail returns textResponse containing "Error fetching summary". The "partial results" test (line 126) also still passes because `fetchProductStats` handles its own error internally (returns fallback, doesn't throw).

**5. TOCTOU fix for close_ticket** - `src/tools/tickets.ts:158-201` (entire close_ticket handler)

Replace the entire handler body with:

```ts
async (args) => {
  const { id, resolution } = args;

  const { data, error } = await supabase
    .from("tickets")
    .update({
      status: "closed",
      closed_at: new Date().toISOString(),
      resolution: resolution || null,
    })
    .eq("id", id)
    .neq("status", "closed")
    .select();

  if (error) {
    return dbErrorResponse(error);
  }

  if (!data || data.length === 0) {
    const { data: check, error: checkError } = await supabase
      .from("tickets")
      .select("status, closed_at")
      .eq("id", id)
      .single();

    if (checkError || !check) {
      return notFoundResponse("Ticket", id);
    }
    if (check.status === "closed") {
      return textResponse(
        `Ticket ${id} is already closed (closed on ${check.closed_at})`,
      );
    }
    return notFoundResponse("Ticket", id);
  }

  return jsonResponse(data[0]);
}
```

Note: added `checkError` handling for the disambiguation query (plan review finding #7).

**EXISTING TESTS BREAK**: Both close_ticket tests in `tests/tickets.test.ts:213-265` need rewriting. Mock order changes from read-then-write to update-first-then-conditional-read:

- "closes an open ticket": first mock = update returning `[{ id, status: "closed", resolution }]`, no second mock needed
- "rejects already-closed": first mock = update returning `[]` (no rows matched .neq), second mock = check read returning `{ status: "closed", closed_at: "2026-01-01" }`
- "returns not found": first mock = update returning `[]`, second mock = check read returning error/null

**6. Null coalescing in formatters** - `src/lib/formatters.ts:27`

Change: `customers?.name || "Unknown Customer"` to `customers?.name ?? "Unknown Customer"`

No existing test breaks (null/undefined tests still pass, no empty-string test exists).

**7. FK violation handling** - `src/lib/errors.ts` + `src/tools/tickets.ts:150`

Add to errors.ts: `export const PG_FK_VIOLATION = "23503";`

Add import in tickets.ts: `import { PG_FK_VIOLATION } from "../lib/errors.js";`
(merge with the PGRST_NOT_FOUND import from fix #3)

In create_ticket error handler (after the insert), replace:
```ts
if (error) {
  return dbErrorResponse(error);
}
```
With:
```ts
if (error) {
  if (error.code === PG_FK_VIOLATION) {
    return textResponse("Cannot create ticket: the linked customer no longer exists");
  }
  return dbErrorResponse(error);
}
```

**8. Static schema comment** - `src/resources/schema.ts:56`

Add above `const customersTable`:
```ts
// Schema is intentionally defined as static TypeScript for this demo.
// If the database schema changes, update these definitions manually.
```

### Tests to Add/Update

For each fix, add test cases to the EXISTING test files (don't create new files):

- `tests/validation.test.ts`: update line 86 assertion, add "strips periods" test
- `tests/tickets.test.ts`: rewrite close_ticket tests (new mock patterns), add get_ticket error discrimination tests, add create_ticket FK violation test, add data[0] empty-array tests
- `tests/customers.test.ts`: add create_customer data[0] empty-array test
- `tests/products.test.ts`: add search_products period-in-query test
- `tests/analytics.test.ts`: add allSettled partial-failure test (some sections fail, others succeed)
- `tests/formatters.test.ts`: add empty-string name test (now returns "" not "Unknown Customer")

Reference: `.claude/reviews/2026-03-01-challenge-tests.ts` has test skeletons, but import paths need fixing (`../../src/` -> `../src/`) and some assertions need updating to match the corrected implementations above.

### Deferred (separate PR)

- Pagination (limit/offset on list tools)
- GIN indexes / full-text search for products
- RPC consolidation for analytics
- delete_customer / delete_ticket tools

## Implementation Order

1. Create branch `fix/challenge-review-findings`
2. Fixes #1-3 (HIGH, simple edits) + update validation test
3. Fix #5 (TOCTOU rewrite) + rewrite close_ticket tests
4. Fix #4 (allSettled) - verify existing analytics tests still pass
5. Fixes #6-8 (small MEDIUM fixes)
6. Add all new tests
7. `npm run check && npm run build && npm run test`
8. Commit and push

## Commands

```bash
npm run build    # TypeScript compile
npm run check    # Biome lint/format
npm run test     # Vitest
```
