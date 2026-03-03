# Handoff: Challenge Review Fixes

## Goal

Apply all fixes identified by a full 16-lens adversarial challenge review of the project. The review found 0 CRITICAL, 6 HIGH, 8 MEDIUM findings across 3 root cause clusters. No code changes were made yet - this is purely implementation work.

## Branch

`chore/fix-migration-paths` (current branch, only has a CLAUDE.md path update)

Consider creating a new branch like `fix/challenge-review-findings` for these changes.

## Current Progress

- Full adversarial review completed (all 16 lenses)
- Review report saved: `.claude/reviews/2026-03-01-challenge.json`
- Generated tests saved: `.claude/reviews/2026-03-01-challenge-tests.ts`
- No source code changes made yet

## Review Artifacts

Read `.claude/reviews/2026-03-01-challenge.json` for the full structured report with finding IDs, severity, file locations, and suggested fixes.

## What Needs to Be Done

### HIGH priority (fix first, 6 findings)

1. **`src/tools/customers.ts:156`** - Add guard before `data[0]` in `create_customer`:
   ```
   if (!data || data.length === 0) return textResponse("Customer created but could not be retrieved");
   ```

2. **`src/tools/tickets.ts:154`** - Same `data[0]` guard in `create_ticket`

3. **`src/tools/tickets.ts:199`** - Same `data[0]` guard in `close_ticket` (use `notFoundResponse("Ticket", id)` here)

4. **`src/lib/validation.ts:30`** - Add `.` to sanitizeFilterValue regex:
   ```
   return value.replace(/[,.()]/g, "");
   ```

5. **`src/tools/tickets.ts:101`** - Fix `get_ticket` error discrimination. Replace:
   ```
   if (error || !data) { return notFoundResponse("Ticket", id); }
   ```
   With the pattern from `get_customer` (lines 69-74): check `error.code === PGRST_NOT_FOUND` for not-found, `dbErrorResponse(error)` for other errors.

### MEDIUM priority (8 findings)

6. **`src/tools/analytics.ts:23`** - `countWhere` throws on error, killing entire `get_summary`. Switch to `Promise.allSettled` or return Result type.

7. **`src/tools/tickets.ts:169`** - Replace TOCTOU read-then-write in `close_ticket` with conditional update: `.update({...}).eq("id", id).neq("status", "closed").select()`, check empty data for already-closed.

8. **`src/tools/customers.ts:30`** + all list tools - Add optional `limit` (default 100) and `offset` params for pagination.

9. **`src/tools/products.ts:41`** - Add GIN indexes in seed.sql or switch to Supabase full-text search.

10. **`src/lib/formatters.ts:27`** - Change `||` to `??`: `customers?.name ?? "Unknown Customer"`

11. **`src/resources/schema.ts:56`** - Add comment that schema is intentionally static.

12. **`src/tools/analytics.ts:131`** - Consider consolidating 12 count queries into a single Supabase RPC.

13. **`src/tools/tickets.ts:131`** - Catch FK violation `23503` in `create_ticket` for "customer was deleted" message.

### Tests

14. Move or adapt tests from `.claude/reviews/2026-03-01-challenge-tests.ts` into `tests/`. Key coverage: `data[0]` empty array, period in search query, `get_ticket` error discrimination, `get_summary` partial failure.

### Optional (portfolio improvement)

15. Add `delete_customer` / `delete_ticket` tools (CLAUDE.md says CRUD but D is missing)
16. Add one complex analytical tool to show more than CRUD plumbing

## What Worked

- The existing test infrastructure with Proxy-based Supabase mock is excellent and makes testing these fixes straightforward
- `update_customer` already has the correct `data[0]` guard pattern at line 203 - copy that pattern to the 3 unguarded locations
- `get_customer` already has the correct PGRST_NOT_FOUND check at lines 69-74 - copy that pattern to `get_ticket`

## Key Decisions

- All HIGH fixes are single-line or few-line changes
- The `sanitizeFilterValue` period fix could theoretically strip legitimate periods from search terms, but PostgREST filter safety outweighs that tradeoff
- Pagination (item 8) is the largest change but can be deferred since the demo dataset is small

## Next Step

Start with the 5 HIGH-priority code fixes (items 1-5), then run `npm run test` to verify nothing breaks. Then add the generated test cases to cover the new guards.
