# Pitfalls Research

**Domain:** MCP Server + Supabase Database Integration
**Researched:** 2026-02-08
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: STDOUT Contamination in STDIO Transport

**What goes wrong:**
Any text written to stdout corrupts the JSON-RPC message stream, causing protocol failures and connection drops. Even a single `console.log()` statement breaks the entire MCP server.

**Why it happens:**
Developers are accustomed to using `console.log()` for debugging, but STDIO transport reserves stdout exclusively for JSON-RPC messages. The protocol expects a clean stream of JSON messages, and any extra text is interpreted as malformed protocol data.

**How to avoid:**
- Redirect ALL logs to stderr using `console.error()` instead of `console.log()`
- Configure logging libraries to write to stderr only
- Never use `console.log()`, `print()`, or any stdout-writing functions in STDIO server code
- Test with verbose logging enabled to catch stray output before deployment

**Warning signs:**
- "JSON-RPC parse error" in client logs
- Connection drops immediately after server starts
- Intermittent protocol failures that appear during tool execution
- Client shows "malformed message" errors

**Phase to address:**
Phase 1 (Foundation) — Set up logging infrastructure correctly from the start. Create a logging utility that enforces stderr-only output.

---

### Pitfall 2: Service Role Key Exposure

**What goes wrong:**
Service role keys bypass ALL Row Level Security policies and grant unrestricted database access. If exposed, attackers gain complete control over your database — they can read, modify, or delete any data without authorization checks.

**Why it happens:**
Developers treat service role keys like regular API keys, committing them to git, hardcoding in source files, or exposing them in client-side code. The BYPASSRLS attribute makes these keys catastrophically dangerous when leaked.

**How to avoid:**
- NEVER commit `.env` files to git — verify `.gitignore` includes `.env` before first commit
- Store keys in environment variables only, never in code
- Use different keys for each environment (dev/staging/prod)
- Never use service role keys in browser/client code — they are server-side only
- Rotate keys quarterly, or immediately if exposure suspected
- Use read-only database roles initially until write operations are required
- Scan for secrets before commits using pre-commit hooks

**Warning signs:**
- `.env` file in git history
- Service key visible in Claude Desktop config (should use env vars)
- Keys in URL parameters or query strings
- Keys in error logs or debugging output

**Phase to address:**
Phase 0 (Setup) — Before writing any code, configure `.gitignore` and environment variable structure. Set up secret scanning in git hooks.

---

### Pitfall 3: Reserved Server Name "supabase" Breaks Custom Servers

**What goes wrong:**
Naming your MCP server "supabase" in `.mcp.json` causes Claude Code to ignore explicit `stdio` configuration and force an OAuth SSE connection to `https://mcp.supabase.com/mcp`. This hard override prevents local Supabase MCP servers from running, even with correct stdio transport configuration.

**Why it happens:**
Claude Code has hardcoded logic that detects the name "supabase" and triggers built-in OAuth integration, overriding user configuration. This is a configuration precedence bug where server name triggers behavior that bypasses explicit transport settings.

**How to avoid:**
- Name your server anything EXCEPT "supabase" (e.g., "techstart-crm", "supabase-local", "crm-db")
- Test server connection immediately after adding to Claude Desktop config
- Document this constraint in your project's README for users who install your server

**Warning signs:**
- Server shows `SSE Connection failed: Non-200 status code (405)` despite stdio config
- Logs show `https://mcp.supabase.com/mcp` connection attempts when you configured stdio
- Server works when renamed but fails with name "supabase"

**Phase to address:**
Phase 4 (Integration) — Name the server appropriately from the start when creating Claude Desktop integration documentation.

---

### Pitfall 4: Overlapping Tool Definitions Confuse Model Selection

**What goes wrong:**
Creating multiple tools with similar purposes causes LLMs to select the wrong tool, leading to incorrect behavior and user frustration. For example, having both `list_customers` and `search_customers` with vague descriptions makes it unclear when to use each.

**Why it happens:**
Developers apply database-oriented design (one function per query type) rather than API-oriented design (one function per use case). Violation of Single Responsibility Principle at the tool level creates semantic overlap.

**How to avoid:**
- Apply Single Responsibility Principle: each tool should have ONE clear purpose
- Use precise, distinct names that clarify intent (not `get_data` and `fetch_data`)
- Write descriptions that explicitly state WHEN to use each tool
- Consolidate similar operations into one tool with parameters (e.g., `list_customers` with optional `filter` param instead of separate `list_active_customers`, `list_inactive_customers`)
- Test tool selection by asking ambiguous questions and verifying LLM chooses correctly

**Warning signs:**
- Multiple tools have similar descriptions
- Tool names differ only by minor wording changes
- LLM consistently picks wrong tool for user requests
- Need to explicitly tell LLM which tool to use

**Phase to address:**
Phase 2 (Tools) — Design tool boundaries carefully during initial tool implementation. Review all tools together for overlap before moving to next phase.

---

### Pitfall 5: Missing or Incorrect Schema Validation

**What goes wrong:**
Tools accept invalid parameters and fail during execution, or worse, silently produce incorrect results. For example, accepting negative prices, future dates for past events, or malformed UUIDs that cause database errors.

**Why it happens:**
Developers assume Zod schema validation is sufficient, but don't add domain-specific constraints. Or they define schemas without testing against actual LLM output, discovering too late that the LLM provides data in unexpected formats.

**How to avoid:**
- Use Zod for ALL tool parameters, never trust LLM output
- Add domain-specific validation beyond type checking (e.g., `.positive()` for prices, `.uuid()` for IDs)
- Include `.describe()` annotations on every field to guide LLM parameter generation
- Test schemas with intentionally invalid data before deployment
- Return actionable errors via `isError: true` with specific guidance on what's wrong
- Verify LLM providers respect your schema constraints (some ignore advanced JSON Schema features)

**Warning signs:**
- Database errors during tool execution (constraint violations)
- Runtime type errors despite Zod schemas
- LLM provides data in unexpected formats
- Silent failures where tool returns success but did the wrong thing

**Phase to address:**
Phase 2 (Tools) — Implement comprehensive Zod schemas alongside each tool. Phase 3 (Testing) — Test validation with malformed inputs.

---

### Pitfall 6: Connection Pool Exhaustion in Long-Running Servers

**What goes wrong:**
MCP servers using direct Postgres connections (not Supabase client) exhaust connection limits as Claude makes repeated tool calls. Server becomes unresponsive, database rejects new connections, and users see timeout errors.

**Why it happens:**
MCP servers are long-running processes (unlike serverless functions) but developers configure connection pooling for serverless patterns. Each tool call may create a new connection without returning it to the pool, leading to connection leak.

**How to avoid:**
- Use Supabase JavaScript client (handles connection pooling automatically)
- If using direct Postgres, configure transaction pooler mode for transient connections
- Create ONE Supabase client instance at startup, reuse across all tool calls
- Never create new client instances per tool invocation
- Monitor connection count during load testing
- Set reasonable pool limits and timeouts

**Warning signs:**
- "Too many connections" errors from Postgres
- Tool calls succeed initially but fail after several invocations
- Server requires restart to recover
- Increased latency over time

**Phase to address:**
Phase 1 (Foundation) — Set up Supabase client initialization correctly with singleton pattern. Document connection management strategy.

---

### Pitfall 7: Unbounded Result Sets Cause Timeouts

**What goes wrong:**
Tools that return thousands of rows (e.g., `list_customers` returning 10,000 records) cause JSON-RPC message size limits to be exceeded, connection timeouts, or LLM context window overflow. Claude receives incomplete data or crashes.

**Why it happens:**
Developers write database queries without pagination, assuming reasonable result sizes. But production data grows, and what works with 50 test records fails with 50,000 production records.

**How to avoid:**
- Implement pagination on ALL list operations (default limit: 50-100 items)
- Add `limit` and `offset` parameters to tool schemas
- Return row counts in responses so LLM knows more data exists
- For large datasets, provide summary/aggregate tools instead of full lists
- Set database query timeouts to fail fast rather than hang
- Test with production-scale data, not just seed data

**Warning signs:**
- Tool calls succeed with test data but timeout in production
- JSON-RPC parse errors with large responses
- Claude shows incomplete results or truncates output
- Slow response times on list operations

**Phase to address:**
Phase 2 (Tools) — Design pagination into list tools from the start. Phase 3 (Testing) — Load test with production-scale datasets.

---

### Pitfall 8: Tool Call Infinite Loops

**What goes wrong:**
LLM triggers tool chains that loop indefinitely: Tool A calls Tool B, which suggests Tool C, which recommends Tool A again. Server appears to hang, consumes excessive API quota, and never returns results to user.

**Why it happens:**
Tools return resource links or suggestions that create circular dependencies. LLM interprets these as instructions to call more tools. For example: `create_ticket` returns customer info with resource link, LLM fetches customer, which returns ticket list, LLM fetches each ticket, cycle repeats.

**How to avoid:**
- Avoid returning resource links that point back to related entities (ticket → customer → tickets)
- Return complete, self-contained results rather than references requiring additional lookups
- Document tool dependencies explicitly to identify potential loops
- Implement call depth limits if your client supports it
- Test multi-step workflows manually before deploying

**Warning signs:**
- Same tool called repeatedly in quick succession
- Tool call logs show circular patterns (A → B → C → A)
- API quota consumed rapidly without user seeing progress
- Server CPU spikes during seemingly simple operations

**Phase to address:**
Phase 3 (Testing) — Test complex multi-tool scenarios. Document tool interaction patterns in testing phase.

---

### Pitfall 9: TypeScript Compilation Artifacts Not Distribution-Ready

**What goes wrong:**
Built JavaScript files fail in production due to incorrect module resolution, missing `.js` extensions on imports, or ESM/CommonJS mismatches. Server works in development with `tsx` but crashes when run from compiled `dist/` folder.

**Why it happens:**
Node.js ESM requires `.js` extensions on relative imports even when source is TypeScript. TypeScript compiler doesn't automatically rewrite imports, causing "Cannot find module" errors in production builds.

**How to avoid:**
- Test compiled output (`node dist/index.js`) before deployment, not just `tsx` dev mode
- Configure TypeScript with `"module": "Node16"` or `"NodeNext"` for correct ESM handling
- Consider using bundlers like `tsdown` or `esbuild` that handle module resolution automatically
- Include build verification in your test script
- Document exact Node.js version requirement (need 18+ for ESM features)

**Warning signs:**
- Server works with `npm run dev` but fails with `npm start`
- "Cannot find module" errors referencing relative paths
- ESM/CommonJS interop errors
- Missing `.js` extension errors in production

**Phase to address:**
Phase 1 (Foundation) — Configure TypeScript correctly from project start. Phase 3 (Testing) — Verify compiled build works before considering server complete.

---

### Pitfall 10: Zod v4 Incompatibility with MCP SDK v1.x

**What goes wrong:**
Installing Zod v4 with MCP SDK v1.x causes runtime errors: `w._parse is not a function`. Tool definitions fail to register, server crashes during schema validation, and no tools are exposed to Claude.

**Why it happens:**
Zod v4 introduced breaking changes to internal API structure. MCP SDK v1.x (current stable) expects Zod v3.x API. Package managers may install latest Zod v4 by default, causing incompatibility.

**How to avoid:**
- Pin Zod to v3.x in `package.json`: `"zod": "^3.23.8"` (not `"zod": "latest"`)
- Check MCP SDK release notes for Zod compatibility matrix
- Run `npm list zod` to verify installed version
- Update to MCP SDK v2 once stable (Q1 2026) for Zod v4 support
- Lock all dependency versions for production deployments

**Warning signs:**
- `w._parse is not a function` error during server startup
- Tools fail to register despite correct definitions
- Schema validation crashes with cryptic errors
- Server worked before dependency update, broke after

**Phase to address:**
Phase 1 (Foundation) — Specify exact dependency versions during project setup. Document version constraints in README.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip RLS, use service role everywhere | Faster development, no auth logic | Security nightmare, data exposure risk, unauditable access | Never acceptable — demo should model good practices |
| No pagination on list operations | Simpler initial implementation | Timeouts, memory issues, poor UX as data grows | Early prototype only — add before production |
| Console.log debugging in stdio server | Quick debugging | Protocol corruption, connection failures | Never in stdio transport — use stderr only |
| Inline connection strings instead of env vars | Works immediately without setup | Secrets in git, no environment separation | Never acceptable |
| Skip schema validation, trust LLM output | Less boilerplate code | Runtime errors, data corruption, security holes | Never acceptable — validation is non-negotiable |
| Hardcode database IDs in tool examples | Examples work immediately | Examples break when reseeded, misleading docs | Acceptable for initial docs if clearly marked as example |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase Client | Creating new client per tool call | Create singleton instance at startup, reuse across tools |
| Environment Variables | Using `process.env` directly throughout code | Load env vars once at startup, validate all required vars present, fail fast if missing |
| Error Messages | Returning database error stack traces to LLM | Sanitize errors, return actionable messages with guidance on how to fix |
| Connection Strings | Using session pooler for long-running MCP server | Use direct connection (not pooler) for long-running processes OR use transaction pooler with Supabase client |
| Row Counts | Returning all matching rows regardless of count | Include pagination metadata (total count, current page, hasMore) in every list response |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| No query limits | Slow responses, timeouts | Default LIMIT 100 on all queries, expose limit as parameter | 1000+ rows in table |
| Joining related tables without bounds | Response size explodes | Return IDs only, provide separate tools to fetch related data | 10+ related records per item |
| Sequential tool calls in loops | Exponential API usage | Return complete data in single call, avoid designs requiring multiple followup calls | 3+ sequential calls needed |
| Full table scans without indexes | Query time increases with data | Index all foreign keys and commonly filtered columns | 10,000+ rows |
| Returning full column text in lists | Large payloads, slow parsing | Return summaries in list, full content only in get operations | Text columns >1KB |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Service role key in client config | Complete database compromise | Use environment variables in server config only, never expose in client-visible configs |
| No input sanitization beyond Zod types | SQL injection via edge cases, command injection | Use parameterized queries only (Supabase client does this automatically), never string concatenate user input |
| Exposing database schema as resource | Information disclosure to attackers | Limit schema resource to table names and types only, exclude RLS policies, internal columns, security details |
| No rate limiting on tools | Resource exhaustion attacks | Implement tool invocation rate limits per session/user |
| Returning PII in error messages | Data leaks in logs | Sanitize all error messages, never include emails, names, addresses in error text |
| UUID exposure as sequential | IDOR attacks if UUIDs are predictable | Use Supabase default `gen_random_uuid()`, verify randomness |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Generic error messages | User has no idea what went wrong or how to fix | Include specific problem + corrective action: "Date must be in format YYYY-MM-DD. You provided: 2025-13-45" |
| No feedback on long operations | User thinks server is frozen | Return progress updates or estimated time for operations taking >2 seconds |
| Cryptic tool names | LLM picks wrong tool, user frustrated | Use domain language users understand: `create_support_ticket` not `insert_ticket_record` |
| Inconsistent date formats across tools | User must remember format per tool | Pick ONE format (ISO 8601) and use everywhere, document in root schema resource |
| Silent failures (returns success but wrong data) | User trusts incorrect results | Validate outputs before returning, set `isError: true` if operation partially failed |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **MCP Server Stdio**: Logging redirected to stderr — verify no stdout writes with test harness
- [ ] **Service Role Key**: In environment variables — verify `.env` in `.gitignore` and not committed to git
- [ ] **Schema Validation**: Zod schemas on all tools — verify each parameter has type, constraints, and description
- [ ] **Error Handling**: Actionable error messages — verify errors include "how to fix" guidance, not just "what failed"
- [ ] **Pagination**: List tools have limits — verify default limit applied, total count returned, offset/cursor supported
- [ ] **Tool Descriptions**: Clear when-to-use guidance — verify LLM can distinguish between similar tools
- [ ] **Connection Pooling**: Supabase client reused — verify singleton pattern, not per-call instantiation
- [ ] **Build Verification**: Compiled code tested — verify `node dist/index.js` works, not just `tsx` dev mode
- [ ] **Dependency Versions**: Zod v3.x with MCP SDK v1.x — verify `package-lock.json` pins compatible versions
- [ ] **Server Naming**: Not named "supabase" — verify Claude Desktop config uses distinct server name

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| STDOUT contamination | LOW | Search for all `console.log` calls, replace with `console.error`, test connection |
| Service role key leaked | HIGH | Immediately rotate key in Supabase dashboard, update all configs, revoke old key, scan for unauthorized access |
| Reserved server name | LOW | Rename server in `.mcp.json`, restart Claude Desktop |
| Overlapping tools | MEDIUM | Consolidate similar tools, update descriptions to clarify differences, test selection with ambiguous queries |
| Missing schema validation | MEDIUM | Add Zod schemas incrementally, test each tool with invalid inputs, deploy tool by tool |
| Connection pool exhaustion | LOW | Restart server, refactor to singleton client pattern, add connection monitoring |
| Unbounded result sets | MEDIUM | Add pagination parameters, set default limits, may require API versioning if breaking change |
| Tool call loops | LOW | Remove circular resource links, return complete data instead of references |
| Build issues | LOW | Configure TypeScript correctly, test build output, may need bundler for complex cases |
| Zod v4 incompatibility | LOW | Downgrade to Zod v3.x, lock version in package.json, clear node_modules and reinstall |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| STDOUT contamination | Phase 1: Foundation | Run server with verbose logging, verify Claude Desktop connects successfully |
| Service role key exposure | Phase 0: Setup | Check git history for `.env`, verify environment variable loading works |
| Reserved server name | Phase 4: Integration | Test Claude Desktop config immediately after creating |
| Overlapping tools | Phase 2: Tools | Test ambiguous queries, verify LLM selects correct tool consistently |
| Missing schema validation | Phase 2: Tools | Send malformed inputs to each tool, verify rejection with helpful errors |
| Connection pool exhaustion | Phase 1: Foundation | Run 100 consecutive tool calls, verify no connection errors |
| Unbounded result sets | Phase 2: Tools | Seed 1000+ records, call list tools, verify pagination works |
| Tool call loops | Phase 3: Testing | Test multi-tool workflows, verify no infinite loops |
| Build issues | Phase 3: Testing | Run `npm run build && node dist/index.js`, verify server starts correctly |
| Zod v4 incompatibility | Phase 1: Foundation | Run `npm list zod`, verify v3.x installed, tools register successfully |

## Sources

### MCP Server Best Practices
- [Nearform: Implementing MCP - Tips, Tricks and Pitfalls](https://nearform.com/digital-community/implementing-model-context-protocol-mcp-tips-tricks-and-pitfalls/) (HIGH confidence)
- [Red Hat: MCP Security Risks and Controls](https://www.redhat.com/en/blog/model-context-protocol-mcp-understanding-security-risks-and-controls) (HIGH confidence)
- [MCP Official Specification: Tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) (HIGH confidence)
- [MCP Official Specification: Transports](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports) (HIGH confidence)

### Supabase Security
- [Supabase Docs: API Keys](https://supabase.com/docs/guides/api/api-keys) (HIGH confidence)
- [Supabase Docs: Securing Your Data](https://supabase.com/docs/guides/database/secure-data) (HIGH confidence)
- [Chat2DB: Securing Service Role Keys](https://chat2db.ai/resources/blog/secure-supabase-role-key) (MEDIUM confidence)

### Integration Issues
- [GitHub Issue #21368: Supabase Name Override Bug](https://github.com/anthropics/claude-code/issues/21368) (HIGH confidence — primary source)
- [Supabase Docs: Connection Management](https://supabase.com/docs/guides/database/connection-management) (HIGH confidence)

### TypeScript and Zod
- [GitHub: MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) (HIGH confidence)
- [GitHub Issue #1429: Zod v4 Incompatibility](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1429) (HIGH confidence)
- [MCPcat: Building MCP Server in TypeScript](https://mcpcat.io/guides/building-mcp-server-typescript/) (MEDIUM confidence)

### WebSearch General Research
- Multiple sources aggregated for validation across: common mistakes, performance patterns, security practices, UX issues (MEDIUM confidence — cross-verified against official docs)

---

*Pitfalls research for: MCP Server + Supabase Database Integration*
*Researched: 2026-02-08*
*Researcher: gsd-project-researcher agent*
