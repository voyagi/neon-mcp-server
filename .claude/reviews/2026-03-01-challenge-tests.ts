import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createSupabaseMock,
	getToolJson,
	getToolText,
	mockQuery,
} from "../../tests/helpers/mock-supabase.js";

vi.mock("../../src/lib/supabase.js", () => createSupabaseMock());

import { supabase } from "../../src/lib/supabase.js";
import { createServer } from "../../src/server.js";

const mockedFrom = vi.mocked(supabase.from);

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

let client: Client;

beforeEach(async () => {
	vi.clearAllMocks();

	const server = createServer();
	const [clientTransport, serverTransport] =
		InMemoryTransport.createLinkedPair();
	await server.connect(serverTransport);

	client = new Client({ name: "challenge-test", version: "1.0.0" });
	await client.connect(clientTransport);
});

// =============================================================================
// Cluster 1: Unguarded data[0] access after insert/update
// =============================================================================

describe("data[0] boundary: create_customer with empty result", () => {
	it("should not return undefined when insert returns empty array", async () => {
		// Simulates RLS blocking the SELECT after INSERT
		mockedFrom.mockReturnValue(
			mockQuery({ data: [], error: null }),
		);

		const result = await client.callTool({
			name: "create_customer",
			arguments: { name: "Test", email: "test@example.com" },
		});

		const text = getToolText(result);
		// Should NOT be "undefined" or empty - should be a valid response
		expect(text).not.toBe("undefined");
		expect(text.length).toBeGreaterThan(0);
	});
});

describe("data[0] boundary: create_ticket with empty result", () => {
	it("should not return undefined when insert returns empty array", async () => {
		const customerId = "abc00000-0000-0000-0000-000000000001";

		// Customer existence check succeeds
		mockedFrom.mockReturnValueOnce(
			mockQuery({ data: { id: customerId }, error: null }),
		);
		// Insert returns empty array (RLS or cascade scenario)
		mockedFrom.mockReturnValueOnce(
			mockQuery({ data: [], error: null }),
		);

		const result = await client.callTool({
			name: "create_ticket",
			arguments: {
				customer_id: customerId,
				subject: "Test ticket",
			},
		});

		const text = getToolText(result);
		expect(text).not.toBe("undefined");
		expect(text.length).toBeGreaterThan(0);
	});
});

describe("data[0] boundary: close_ticket with empty update result", () => {
	it("should not return undefined when update affects 0 rows", async () => {
		const ticketId = "abc00000-0000-0000-0000-000000000001";

		// Fetch existing ticket - open
		mockedFrom.mockReturnValueOnce(
			mockQuery({
				data: { status: "open", closed_at: null },
				error: null,
			}),
		);
		// Update returns empty (row deleted between read and write)
		mockedFrom.mockReturnValueOnce(
			mockQuery({ data: [], error: null }),
		);

		const result = await client.callTool({
			name: "close_ticket",
			arguments: { id: ticketId },
		});

		const text = getToolText(result);
		expect(text).not.toBe("undefined");
		expect(text.length).toBeGreaterThan(0);
	});
});

// =============================================================================
// Cluster 2: PostgREST filter injection via period character
// =============================================================================

describe("search_products: period in query", () => {
	it("should handle query containing periods without DB error", async () => {
		// A search for "v2.0" should not break the PostgREST filter
		mockedFrom.mockReturnValue(
			mockQuery({ data: [], error: null }),
		);

		const result = await client.callTool({
			name: "search_products",
			arguments: { query: "v2.0 Pro" },
		});

		// Should get a valid response, not a DB error from malformed filter
		const parsed = getToolJson(result);
		expect(parsed).toHaveProperty("count");
	});

	it("should handle query with PostgREST-like syntax", async () => {
		mockedFrom.mockReturnValue(
			mockQuery({ data: [], error: null }),
		);

		const result = await client.callTool({
			name: "search_products",
			arguments: { query: "name.eq.secret" },
		});

		const parsed = getToolJson(result);
		expect(parsed).toHaveProperty("count");
	});
});

// =============================================================================
// Cluster 3: Error type conflation in get_ticket
// =============================================================================

describe("get_ticket: error discrimination", () => {
	it("should return DB error message for connection failures, not 'not found'", async () => {
		mockedFrom.mockReturnValue(
			mockQuery({
				data: null,
				error: { message: "connection timeout", code: "PGRST000" },
			}),
		);

		const result = await client.callTool({
			name: "get_ticket",
			arguments: { id: "abc00000-0000-0000-0000-000000000001" },
		});

		const text = getToolText(result);
		// Should indicate a DB error, not "not found"
		// Currently this FAILS because get_ticket conflates all errors
		expect(text).toContain("Database error");
	});

	it("should return 'not found' only for PGRST116", async () => {
		mockedFrom.mockReturnValue(
			mockQuery({
				data: null,
				error: { message: "not found", code: "PGRST116" },
			}),
		);

		const result = await client.callTool({
			name: "get_ticket",
			arguments: { id: "abc00000-0000-0000-0000-000000000999" },
		});

		const text = getToolText(result);
		expect(text).toContain("not found");
	});
});

// =============================================================================
// get_summary: partial failure tolerance
// =============================================================================

describe("get_summary: single query failure", () => {
	it("should return a text error, not crash, when a count query throws", async () => {
		// First query throws
		mockedFrom.mockImplementation(() => {
			throw new Error("rate limited");
		});

		const result = await client.callTool({
			name: "get_summary",
			arguments: {},
		});

		const text = getToolText(result);
		expect(text).toContain("Error fetching summary");
		expect(text).toContain("rate limited");
	});
});

// =============================================================================
// Validation edge cases
// =============================================================================

import { sanitizeFilterValue, sanitizeLikeValue } from "../../src/lib/validation.js";

describe("sanitizeFilterValue: PostgREST structural characters", () => {
	it("strips commas", () => {
		expect(sanitizeFilterValue("a,b")).toBe("ab");
	});

	it("strips parentheses", () => {
		expect(sanitizeFilterValue("a(b)c")).toBe("abc");
	});

	it("currently does NOT strip periods (known gap)", () => {
		// This documents the current behavior as a known limitation
		expect(sanitizeFilterValue("a.b.c")).toBe("a.b.c");
	});
});

describe("sanitizeLikeValue: edge cases", () => {
	it("handles string with all special characters", () => {
		const result = sanitizeLikeValue("%_\\");
		expect(result).toBe("\\%\\_\\\\");
	});

	it("handles very long strings", () => {
		const long = "a".repeat(10000);
		expect(sanitizeLikeValue(long)).toBe(long);
	});
});

// =============================================================================
// Idempotency: close_ticket on already-closed ticket
// =============================================================================

describe("close_ticket: idempotency", () => {
	it("rejects closing an already-closed ticket with informative message", async () => {
		const ticketId = "abc00000-0000-0000-0000-000000000001";

		mockedFrom.mockReturnValueOnce(
			mockQuery({
				data: { status: "closed", closed_at: "2026-01-15T00:00:00Z" },
				error: null,
			}),
		);

		const result = await client.callTool({
			name: "close_ticket",
			arguments: { id: ticketId },
		});

		const text = getToolText(result);
		expect(text).toContain("already closed");
		expect(text).toContain("2026-01-15");
	});
});

// =============================================================================
// Contract: update_customer with no fields
// =============================================================================

describe("update_customer: empty update protection", () => {
	it("returns informative error when no updatable fields are provided", async () => {
		const result = await client.callTool({
			name: "update_customer",
			arguments: { id: "abc00000-0000-0000-0000-000000000123" },
		});

		const text = getToolText(result);
		expect(text).toContain("No fields");
	});
});

// =============================================================================
// Formatter edge cases
// =============================================================================

import { formatTicketListItem, formatPrice } from "../../src/lib/formatters.js";

describe("formatTicketListItem: null customer handling", () => {
	it("returns 'Unknown Customer' when customers join is null", () => {
		const result = formatTicketListItem({
			id: "t1",
			subject: "test",
			customers: null,
		});
		expect(result.customer_name).toBe("Unknown Customer");
	});

	it("returns 'Unknown Customer' when customers join is undefined", () => {
		const result = formatTicketListItem({
			id: "t1",
			subject: "test",
		});
		expect(result.customer_name).toBe("Unknown Customer");
	});

	it("uses || not ?? so empty string name becomes 'Unknown Customer'", () => {
		// Documents the current behavior - empty string is treated as falsy
		const result = formatTicketListItem({
			id: "t1",
			subject: "test",
			customers: { name: "" },
		});
		expect(result.customer_name).toBe("Unknown Customer");
	});
});

describe("formatPrice: edge cases", () => {
	it("handles zero cents", () => {
		expect(formatPrice(0)).toBe("$0.00");
	});

	it("handles negative cents", () => {
		expect(formatPrice(-1000)).toBe("$-10.00");
	});

	it("handles fractional cents (floating point)", () => {
		// 1 cent
		expect(formatPrice(1)).toBe("$0.01");
	});
});
