import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { vi } from "vitest";

/**
 * Creates the mock module shape for vi.mock("../src/lib/db.js").
 * The sql mock is a vi.fn() that can be configured per-test:
 *   mockedSql.mockResolvedValueOnce([{ id: "1", name: "Alice" }]);
 *   mockedSql.mockRejectedValueOnce(pgError("duplicate key", "23505"));
 */
export function createDbMock() {
	return {
		sql: vi.fn().mockResolvedValue([]),
		query: vi.fn().mockResolvedValue([]),
		validateConnection: vi.fn().mockResolvedValue(undefined),
	};
}

/** Creates a PostgreSQL-style error with an error code */
export function pgError(message: string, code?: string): Error {
	const err = new Error(message);
	if (code) (err as Error & { code: string }).code = code;
	return err;
}

// Extract the text content from an MCP tool result
export function getToolText(result: CallToolResult): string {
	return (result.content[0] as { type: "text"; text: string }).text;
}

export function getToolJson(result: CallToolResult): Record<string, unknown> {
	return JSON.parse(getToolText(result)) as Record<string, unknown>;
}
