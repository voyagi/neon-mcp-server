# Technology Stack

**Analysis Date:** 2026-02-08

## Languages

**Primary:**
- TypeScript 5.8.3 - Entire codebase; strict mode enabled with source maps for debugging
- Node.js 22.15.0 (implied by @types/node version) - Runtime environment

**Secondary:**
- JavaScript (transpiled from TypeScript via tsc) - Execution output

## Runtime

**Environment:**
- Node.js 22.x (ES2022 target)
- ES Module system (type: "module" in `package.json`)

**Package Manager:**
- npm (lockfile: `package-lock.json` present)
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- @modelcontextprotocol/sdk 1.12.1 - MCP server framework with stdio transport for Claude Desktop/Code integration

**Utilities:**
- @supabase/supabase-js 2.49.4 - PostgreSQL database client and API wrapper

**Validation:**
- Zod 3.24.4 - Runtime schema validation for tool inputs and API responses

**Build/Dev:**
- TypeScript 5.8.3 - Language compiler
- tsx 4.19.4 - TypeScript execution for development with watch mode (npm run dev)
- @biomejs/biome 2.0.0 - Linting, formatting, and code organization (replaces ESLint/Prettier)

**Testing:**
- Not detected - No test framework configured

## Key Dependencies

**Critical:**
- @modelcontextprotocol/sdk 1.12.1 - Defines MCP protocol, tool/resource registration, and stdio server transport
- @supabase/supabase-js 2.49.4 - Enables database queries against Supabase Postgres instance

**Infrastructure:**
- @types/node 22.15.0 - TypeScript type definitions for Node.js APIs
- tsx 4.19.4 - Enables fast TypeScript execution in development without full compile step

## Configuration

**Environment:**
- Loaded from `.env` file via `process.env` (see `src/lib/supabase.ts`)
- Required vars:
  - `SUPABASE_URL` - Supabase project URL
  - `SUPABASE_SERVICE_ROLE_KEY` - Service role API key with full database access

**Build:**
- `tsconfig.json`:
  - Target: ES2022
  - Module: Node16
  - Strict mode enabled
  - Declaration and source maps enabled
  - Output directory: `./dist`
  - Root directory: `./src`

**Code Quality:**
- `biome.json`:
  - VCS integration: Git with .gitignore awareness
  - Formatter: Enabled with tab indentation
  - Linter: Recommended rules
  - JavaScript quote style: Double quotes
  - Import organization: Enabled

## Platform Requirements

**Development:**
- Node.js 22.x or compatible
- npm (or yarn/pnpm)
- Git (for Biome vcs integration)

**Production:**
- Node.js 22.x
- Deployment: Claude Desktop config integration via stdio transport
- Environment: Headless (stdio-based communication with Claude)

## Scripts

**Build:**
```bash
npm run build          # Compile TypeScript to dist/
```

**Development:**
```bash
npm run dev            # Run with tsx watch (hot reload)
npm run lint           # Biome lint with write
npm run format         # Biome format with write
npm run check          # Biome check (lint + format)
```

**Production:**
```bash
npm run start          # Run compiled dist/index.js
```

---

*Stack analysis: 2026-02-08*
