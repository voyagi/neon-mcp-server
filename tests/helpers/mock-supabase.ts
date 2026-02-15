import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { vi } from "vitest";

type QueryResult = {
	data: unknown;
	error: { message: string; code?: string } | null;
	count?: number | null;
};

/**
 * Creates a chainable mock that mimics Supabase's query builder.
 * Every method returns the same proxy, so `.from().select().eq()` works.
 * When awaited, resolves with the provided result.
 */
export function mockQuery(result: QueryResult) {
	const handler: ProxyHandler<object> = {
		get(_target, prop) {
			if (prop === "then") {
				return (resolve: (value: QueryResult) => void) =>
					Promise.resolve(result).then(resolve);
			}
			if (prop === "catch") {
				return (reject: (reason: unknown) => void) =>
					Promise.resolve(result).catch(reject);
			}
			// Any method call returns the proxy (chaining)
			return vi.fn(() => new Proxy({}, handler));
		},
	};
	return new Proxy({}, handler);
}

/**
 * Creates the mock module shape for vi.mock("../src/lib/supabase.js").
 * Usage in tests:
 *   vi.mock("../src/lib/supabase.js", () => createSupabaseMock());
 *   // then per-test:
 *   vi.mocked(supabase.from).mockReturnValue(mockQuery({ data: [...], error: null }));
 */
export function createSupabaseMock() {
	return {
		supabase: { from: vi.fn() },
		validateConnection: vi.fn().mockResolvedValue(undefined),
	};
}

// Extract the text content from an MCP tool result, removing `as any` casts
export function getToolText(result: CallToolResult): string {
	return (result.content[0] as { type: "text"; text: string }).text;
}

export function getToolJson(result: CallToolResult): unknown {
	return JSON.parse(getToolText(result));
}
