# Codebase Concerns

**Analysis Date:** 2026-02-08

## Tech Debt

**Incomplete MCP Server Implementation:**
- Issue: `src/server.ts` is a scaffold with no tools or resources registered. Server returns an empty McpServer with only name and version metadata.
- Files: `src/server.ts`
- Impact: Server is non-functional. Cannot execute any database operations. None of the documented tools (customers, tickets, products, analytics) are implemented.
- Fix approach: Implement all 14 tools across `src/tools/customers.ts`, `src/tools/tickets.ts`, `src/tools/products.ts`, and `src/tools/analytics.ts`. Implement resource handler for `schema://tables`. Register tools and resources in `src/server.ts`.

**Missing Tool Implementations:**
- Issue: Entire `/src/tools/` directory is missing. CLAUDE.md specifies 14 tools but none exist.
- Files: Directory does not exist (should be `src/tools/`)
- Impact: MCP server cannot handle any Claude requests. All customer, ticket, product, and analytics operations are unavailable.
- Fix approach: Create directory structure and implement tool handlers with Zod validation, error handling, and Supabase queries for each documented tool.

**Missing Resource Handlers:**
- Issue: `schema://tables` resource is documented in CLAUDE.md but no resource handler implemented.
- Files: `src/resources/` directory missing
- Impact: Claude cannot introspect database schema. Reduces usability for natural language queries.
- Fix approach: Create `src/resources/schema.ts` with handler that returns table definitions (columns, types, constraints).

## Security Considerations

**Weak Environment Variable Validation:**
- Risk: `src/lib/supabase.ts` silently accepts empty strings if env vars are missing. Uses nullish coalescing (`??`) with empty string fallback instead of error-throwing validation.
- Files: `src/lib/supabase.ts` (lines 3-4)
- Current mitigation: None. Server will initialize with invalid credentials and fail only when first database operation is attempted.
- Recommendations:
  - Add startup validation that throws if either `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` are missing or empty
  - Move validation to `src/index.ts` main() function before creating server
  - Example: Use Zod for env validation with `.parse()` instead of nullish coalescing

**Service Role Key Exposure Risk:**
- Risk: Service role key (full database access) required in environment and passed to Claude Desktop config. If developer accidentally commits .env or shares config, full database access is exposed.
- Files: `src/lib/supabase.ts`, CLAUDE.md setup instructions
- Current mitigation: `.env` is in `.gitignore` (verified)
- Recommendations:
  - Document that service role key should NEVER be shared or committed
  - Consider implementing Row-Level Security (RLS) policies in Supabase as defense-in-depth
  - Use a more restricted Postgres role if possible (though MCP context protocol limitations may require service role)

**No Input Validation on Tool Parameters:**
- Risk: Tools are not yet implemented, but when they are, they need Zod schemas for all inputs. Risk: SQL injection if inputs are not validated before queries.
- Files: `src/tools/` (to be created)
- Current mitigation: Zod is in dependencies but not used yet
- Recommendations:
  - Use Zod for ALL tool parameter validation
  - Use parameterized queries (@supabase/supabase-js uses parameterized queries by default, but verify in implementation)
  - Never interpolate user input into SQL strings

## Performance Bottlenecks

**No Pagination Implemented:**
- Problem: `list_customers`, `list_tickets`, and `list_products` tools are not implemented, but will likely lack pagination. Returning 1000+ records to Claude could be slow.
- Files: `src/tools/` (to be created)
- Cause: No limits on query results. Supabase client allows range filtering but tool specs don't define pagination.
- Improvement path:
  - Add `limit` and `offset` parameters to list tools
  - Default limit to 50-100, max 500
  - Return total count metadata for Claude context

**No Database Connection Pooling Configuration:**
- Problem: `@supabase/supabase-js` client is instantiated as singleton but pool settings are not configured.
- Files: `src/lib/supabase.ts`
- Cause: Default Supabase client configuration may not be optimal for concurrent requests in MCP server context.
- Improvement path:
  - Document expected concurrent usage patterns
  - If using real Supabase, pool settings are managed server-side and not a concern
  - If using local Postgres backend, ensure connection limits are set

## Fragile Areas

**Empty Server Definition Blocks Future Development:**
- Files: `src/server.ts`
- Why fragile: The return statement on line 17 returns an empty server. Any tool registrations added later could conflict if not properly integrated. Hard to track what's registered where.
- Safe modification:
  - Break tool registration into separate functions per domain (e.g., `registerCustomerTools()`, `registerTicketTools()`)
  - Add a helper to register tools with error logging
  - Keep the server creation minimal in `createServer()`, move tool registration to separate call
- Test coverage: Zero tests. No verification that tools are registered or callable.

**Type Interfaces vs. Supabase Reality:**
- Files: `src/lib/types.ts`
- Why fragile: TypeScript interfaces define shape of data (e.g., `Customer`, `Ticket`, `Product`) but there's no validation layer that ensures Supabase actually returns matching shapes. If database schema changes, types are wrong but no error is thrown at runtime.
- Safe modification:
  - Create Zod schemas for all domain types (customer, ticket, product)
  - Use `.parse()` on all Supabase responses to ensure type safety
  - Example: `const customer = CustomerSchema.parse(data)`
- Test coverage: No validation tests. No schema mismatch detection.

**Hardcoded Import Path Assumptions:**
- Files: `src/index.ts` (lines 1-2)
- Why fragile: Imports use `.js` extensions (ES modules). Works on Node 16+, but if runtime or build process changes, these could break.
- Safe modification: Keep `.js` extensions (correct for ES modules), but add build verification step in CI
- Test coverage: No build artifact testing.

## Dependencies at Risk

**Zod Added but Unused:**
- Risk: Zod 3.24.4 is in dependencies but not used anywhere in the codebase. Indicates incomplete refactoring or leftover from earlier design.
- Impact: Unused dependency adds to bundle size (though Zod is ~15KB minified). Creates confusion about intended validation approach.
- Migration plan: Either remove if validation will use different approach, or start using immediately in all tools (recommended).

**MCP SDK Version Pinned Loosely:**
- Risk: `@modelcontextprotocol/sdk` at `^1.12.1` allows minor/patch updates. MCP protocol is still evolving; breaking changes possible in minor versions.
- Impact: Unexpected server behavior or incompatibility with Claude Desktop if SDK patch breaks protocol compatibility.
- Migration plan:
  - Consider pinning to exact version (`1.12.1`) for production portfolio demo
  - Add tests that verify protocol compatibility with Claude Desktop
  - Monitor MCP SDK releases for breaking changes

## Missing Critical Features

**No Error Handling in Startup:**
- Problem: `src/index.ts` catches errors at process level but no pre-flight checks before stdio transport connects.
- Blocks: If environment is misconfigured, error appears in stderr but client may not see meaningful message.
- Path: Add validation function called before `server.connect(transport)` that checks:
  - Supabase credentials are valid (test connection or check URL format)
  - Environment is configured correctly
  - Throw descriptive errors instead of silent failures

**No Graceful Shutdown Handler:**
- Problem: MCP server has no cleanup logic if connection terminates or process receives SIGTERM.
- Blocks: If server crashes, Claude Desktop may not know and try to reconnect indefinitely.
- Path: Add `.on('close')` handler to transport, implement graceful shutdown for any open queries

**No Logging Framework:**
- Problem: Only `console.error()` used. No structured logging, no debug mode, no request tracing.
- Blocks: If tools fail in production (Upwork demo), debugging will be very difficult. No visibility into what Claude is asking.
- Path: Add structured logging (e.g., `winston` or `pino`) with:
  - Tool invocation logging
  - Database query logging (redacted)
  - Error logging with stack traces
  - Request/response timing

**No TypeScript Strict Null Checks Edge Cases:**
- Problem: `tsconfig.json` has `strict: true` but several fields in types are nullable without explicit null handling:
  - `company?: string | null` in Customer
  - `description?: string | null` in Product
  - `description?: string | null` in Ticket
  - `closed_at?: string | null` in Ticket
- Blocks: Tools may crash if nullable fields are accessed without checking. Format is inconsistent (optional vs. nullable).
- Path: Decide per type whether fields are `optional` or `nullable`:
  - If field always exists but can be empty: use `field: string | null`
  - If field may be absent: use `field?: string`
  - Add nullish coalescing or optional chaining in tool handlers

## Test Coverage Gaps

**No Tests:**
- What's not tested: Nothing. Zero test files in project.
- Files: No test directory exists
- Risk: High. Database operations untested. Tool logic untested. Upwork portfolio demo could fail visibly on camera.
- Priority: High (before sharing portfolio)
- Path:
  - Add Jest or Vitest config
  - Write unit tests for each tool (mock Supabase)
  - Write integration tests with test Supabase project
  - Aim for >80% coverage on tools and resources

**No Integration Tests with Real Supabase:**
- What's not tested: Connection to actual Supabase instance. Query correctness. Data transformation.
- Files: None (would be `src/**/*.integration.test.ts`)
- Risk: Demo may fail when connected to real database if types/queries are wrong.
- Priority: High (before Upwork demo)
- Path: Create test Supabase project, seed with test data, run full integration tests

**No End-to-End Claude Integration Tests:**
- What's not tested: MCP protocol handshake. Tool invocation from Claude. Response formatting.
- Files: None
- Risk: Server may fail to start or tools may be invisible to Claude.
- Priority: Critical (before sharing with clients)
- Path: Test with Claude Desktop or CLI to ensure server starts and at least one tool is callable

---

*Concerns audit: 2026-02-08*
