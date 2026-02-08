# Coding Conventions

**Analysis Date:** 2026-02-08

## Naming Patterns

**Files:**
- TypeScript source files: `camelCase.ts` (e.g., `supabase.ts`, `index.ts`)
- Organized by domain/function: `tools/`, `resources/`, `lib/` directories
- Main entry point: `index.ts`
- Configuration: `tsconfig.json`, `biome.json`

**Functions:**
- camelCase for all functions (e.g., `createServer`, `main`)
- Exported functions documented with purpose comment above definition
- Async functions use async/await pattern, not `.then()` chains

**Variables:**
- camelCase for all variables and constants
- Const by default; let only when reassignment needed
- Environment variables accessed via `process.env.VAR_NAME` with nullish coalescing fallback: `process.env.SUPABASE_URL ?? ""`

**Types:**
- PascalCase for interfaces (e.g., `Customer`, `Product`, `Ticket`)
- Union types for enums: `"active" | "inactive" | "lead"` rather than enum keyword
- Null safety: use `string | null` for optional fields (e.g., `description: string | null`)
- All database entity types defined in `src/lib/types.ts`

## Code Style

**Formatting:**
- Tool: Biome 2.0.0
- Indent: Tabs (not spaces)
- Quote style: Double quotes (`"`)
- See `biome.json` for comprehensive settings

**Linting:**
- Tool: Biome (enabled with recommended ruleset)
- Auto-fix available: `npm run check` applies all fixes
- Import organization: enabled via `assist.actions.source.organizeImports`
- Ignores: `node_modules`, unknown file types handled gracefully

**Key Biome Rules:**
- Enabled: `"recommended": true` (covers all standard best practices)
- VCS integration: Git-aware, respects `.gitignore`

## Import Organization

**Order:**
1. External packages (e.g., `@modelcontextprotocol/sdk`, `@supabase/supabase-js`)
2. Internal modules (e.g., `./server.js`, `./lib/types.ts`)
3. Relative imports use explicit file extensions (e.g., `./server.js` not `./server`)

**Path Aliases:**
- None configured; relative paths used throughout
- All imports are explicit with full paths

**Module Type:**
- `"type": "module"` in `package.json` — ES modules only
- All files use ES6 import/export syntax

## Error Handling

**Patterns:**
- Top-level entry points use `.catch()` to handle async errors:
  ```typescript
  main().catch((error) => {
  	console.error("Failed to start MCP server:", error);
  	process.exit(1);
  });
  ```
- Errors logged to stderr via `console.error()` (critical for MCP stdio transport)
- Never swallow errors silently
- Error messages include context: what failed and what action was taken

## Logging

**Framework:** console (native)

**Patterns:**
- Use `console.error()` for all logging (MCP transports over stdio; stdout is reserved for protocol)
- Log startup messages to stderr: `console.error("TechStart CRM MCP server running on stdio")`
- Include descriptive context in error messages

## Comments

**When to Comment:**
- Explain WHY, not WHAT
- Document non-obvious business logic (e.g., "Tools and resources will be registered here during development")
- Reference related documentation (e.g., "See CLAUDE.md for the full list of tools to implement")

**JSDoc/TSDoc:**
- Not currently used; consider for exported functions once implementation expands
- Function signatures are clear from TypeScript types; focus on business context in comments

## Function Design

**Size:** Small, single-responsibility functions

**Example:**
```typescript
export function createServer() {
	const server = new McpServer({
		name: "techstart-crm",
		version: "0.1.0",
	});
	// Tools and resources registered here
	return server;
}
```

**Parameters:** Typed via TypeScript; use objects for multiple related params

**Return Values:** Explicit return types; use typed objects or interfaces

## Module Design

**Exports:** Named exports preferred over default exports

**Barrel Files:** Not used yet; domain-based organization:
- `src/lib/types.ts` — Shared type definitions
- `src/lib/supabase.ts` — Database client initialization
- `src/server.ts` — MCP server configuration

**Organization by Domain:**
- All entity types in `lib/types.ts`
- All database operations in `lib/supabase.ts`
- MCP server setup in `server.ts`
- Tools will be organized in `tools/` directory
- Resources in `resources/` directory

## Environment Configuration

**env vars:**
- Use nullish coalescing to provide defaults: `process.env.SUPABASE_URL ?? ""`
- All env vars listed in `.env.example`
- No secrets committed to git (verified in `.gitignore`)

---

*Convention analysis: 2026-02-08*
