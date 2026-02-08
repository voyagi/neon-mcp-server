# Testing Patterns

**Analysis Date:** 2026-02-08

## Test Framework

**Status:** Not yet implemented

**Runner:**
- None currently installed
- Recommended: Vitest (modern, ESM-native, fastest for Node.js)
- Alternative: Jest (if preferred; requires ESM configuration)

**Assertion Library:**
- None currently installed
- Built-in Node.js test runner available (Node 18+)
- Or pair with: Node assert + Vitest/Jest built-in matchers

**Run Commands (to be implemented):**
```bash
npm run test              # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

## Test File Organization

**Location:**
- Co-located with source: `src/**/*.test.ts` or `src/**/*.spec.ts`
- Tests in same directory as implementation for easier maintenance

**Naming:**
- Pattern: `[module].test.ts` (e.g., `supabase.test.ts`)
- One test file per source module

**Structure (to implement):**
```
src/
  lib/
    supabase.ts
    supabase.test.ts      # Tests for Supabase client
    types.ts              # Types don't need tests
  server.test.ts          # Tests for server setup
  index.test.ts           # Integration tests for entry point
```

## Test Structure

**Suite Organization (expected pattern):**
```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("supabase client", () => {
	beforeEach(() => {
		// Setup before each test
	});

	afterEach(() => {
		// Cleanup after each test
	});

	it("should initialize client with correct credentials", () => {
		expect(supabase).toBeDefined();
	});
});
```

**Patterns to follow:**
- One logical assertion per `it()` block
- Descriptive test names: `"should [expected behavior] when [condition]"`
- Use `beforeEach` for common setup
- Use `afterEach` for cleanup (e.g., clearing mocks, closing connections)

## Mocking

**Framework:** TBD (Vitest recommended)

**Patterns (to implement):**
```typescript
import { vi } from "vitest";

// Mock Supabase client
vi.mock("@supabase/supabase-js", () => ({
	createClient: vi.fn(() => ({
		from: vi.fn(() => ({
			select: vi.fn().mockResolvedValue({ data: [] }),
		})),
	})),
}));
```

**What to Mock:**
- External services: Supabase API calls
- Environment variables: Mock via `import.meta.env` or test setup
- File I/O: If any implemented

**What NOT to Mock:**
- Core MCP SDK types/interfaces
- Internal utility functions
- Type definitions
- Database schema (use test data/fixtures instead)

## Fixtures and Factories

**Test Data (to implement):**
```typescript
// src/lib/test-fixtures.ts
export const mockCustomer = {
	id: "test-customer-123",
	name: "John Doe",
	email: "john@example.com",
	company: "Acme Corp",
	status: "active" as const,
	created_at: new Date().toISOString(),
};

export const mockTicket = {
	id: "test-ticket-456",
	customer_id: mockCustomer.id,
	subject: "Test issue",
	description: "Test description",
	status: "open" as const,
	priority: "medium" as const,
	created_at: new Date().toISOString(),
	closed_at: null,
};
```

**Location:**
- Fixtures in `src/lib/test-fixtures.ts` for shared test data
- Domain-specific factories in corresponding `*.test.ts` files
- Keep fixtures minimal; extend in tests as needed

## Coverage

**Requirements:** Not enforced yet

**Target (recommended):**
- Aim for 80%+ coverage of public APIs
- Critical paths (database operations): 90%+
- Type definitions: Not counted (types verified by TypeScript)

**View Coverage (when implemented):**
```bash
npm run test:coverage
# Generates coverage/ directory with HTML report
# Open coverage/index.html in browser
```

## Test Types

**Unit Tests:**
- Scope: Individual functions and modules
- Example: Supabase client initialization
- Approach: Mock external dependencies (API calls)
- Location: `src/lib/supabase.test.ts`

**Integration Tests:**
- Scope: Multiple modules working together
- Example: MCP server initialization with tools
- Approach: Use mocked Supabase; test server setup
- Location: `src/server.test.ts`

**E2E Tests:**
- Status: Not planned for MVP
- Future: Screen recordings with Claude Desktop (manual for now)
- Could use: Playwright for testing MCP behavior via test client

## Common Patterns

**Async Testing:**
```typescript
it("should list customers from database", async () => {
	const result = await listCustomers();
	expect(result).toEqual(expect.arrayContaining([mockCustomer]));
});
```

**Error Testing:**
```typescript
it("should throw error when database connection fails", async () => {
	vi.mocked(supabase.from).mockRejectedValueOnce(
		new Error("Connection failed")
	);
	await expect(listCustomers()).rejects.toThrow("Connection failed");
});
```

**Zod Schema Validation:**
```typescript
import { z } from "zod";

const CustomerSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
});

it("should validate customer schema", () => {
	expect(() => CustomerSchema.parse(mockCustomer)).not.toThrow();
});
```

## Environment & Configuration

**Test Setup:**
- Mock `.env` variables: Use `import.meta.env` with test overrides
- Example: `import.meta.env.SUPABASE_URL = "http://localhost:54321"`
- Vitest config (to create): `vitest.config.ts`

**Build Before Testing:**
- Run `npm run build` before running tests to ensure TypeScript is valid
- Or use TypeScript-aware test runner (Vitest handles this automatically)

---

*Testing analysis: 2026-02-08*
