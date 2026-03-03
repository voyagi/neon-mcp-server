import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createSupabaseMock,
	getToolJson,
	getToolText,
	mockQuery,
} from "./helpers/mock-supabase.js";

vi.mock("../src/lib/supabase.js", () => createSupabaseMock());

import { supabase } from "../src/lib/supabase.js";
import { createServer } from "../src/server.js";
import { aggregateByCategory } from "../src/tools/analytics.js";

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

	client = new Client({ name: "test", version: "1.0.0" });
	await client.connect(clientTransport);
});

describe("get_summary", () => {
	it("returns aggregated dashboard stats", async () => {
		// Batch 1: Customer counts (3 queries)
		mockedFrom
			.mockReturnValueOnce(
				mockQuery({ data: null, error: null, count: 15 }),
			) // active
			.mockReturnValueOnce(
				mockQuery({ data: null, error: null, count: 4 }),
			) // inactive
			.mockReturnValueOnce(
				mockQuery({ data: null, error: null, count: 3 }),
			); // lead

		// Batch 2: Ticket counts (6 queries)
		mockedFrom
			.mockReturnValueOnce(
				mockQuery({ data: null, error: null, count: 14 }),
			) // open
			.mockReturnValueOnce(
				mockQuery({ data: null, error: null, count: 9 }),
			) // closed
			.mockReturnValueOnce(
				mockQuery({ data: null, error: null, count: 3 }),
			) // urgent
			.mockReturnValueOnce(
				mockQuery({ data: null, error: null, count: 5 }),
			) // high
			.mockReturnValueOnce(
				mockQuery({ data: null, error: null, count: 4 }),
			) // medium
			.mockReturnValueOnce(
				mockQuery({ data: null, error: null, count: 2 }),
			); // low

		// Batch 3: Products + recent activity (3 queries)
		mockedFrom
			.mockReturnValueOnce(
				mockQuery({
					data: [
						{ price_cents: 4900, category: "subscription" },
						{ price_cents: 14900, category: "subscription" },
						{ price_cents: 2900, category: "add-on" },
					],
					error: null,
				}),
			) // products
			.mockReturnValueOnce(
				mockQuery({ data: null, error: null, count: 2 }),
			) // recent customers
			.mockReturnValueOnce(
				mockQuery({ data: null, error: null, count: 1 }),
			); // recent closed tickets

		const result = await client.callTool({
			name: "get_summary",
			arguments: {},
		});

		const parsed = getToolJson(result);

		expect(parsed.customers.active).toBe(15);
		expect(parsed.customers.inactive).toBe(4);
		expect(parsed.customers.leads).toBe(3);
		expect(parsed.customers.total).toBe(22);

		expect(parsed.tickets.open).toBe(14);
		expect(parsed.tickets.closed).toBe(9);
		expect(parsed.tickets.by_priority.urgent).toBe(3);

		expect(parsed.products.total_value).toBe("$227.00");
		expect(parsed.products.by_category).toHaveLength(2);

		expect(parsed.recent_activity.customers_created_this_week).toBe(2);
		expect(parsed.recent_activity.tickets_closed_this_week).toBe(1);
	});

	it("handles query errors gracefully", async () => {
		// Make the first query throw
		mockedFrom.mockImplementation(() => {
			throw new Error("Supabase unavailable");
		});

		const result = await client.callTool({
			name: "get_summary",
			arguments: {},
		});

		const text = getToolText(result);
		expect(text).toContain("Error fetching summary");
	});

	it("returns partial results when products query fails", async () => {
		// Customer counts (3 queries)
		mockedFrom
			.mockReturnValueOnce(
				mockQuery({ data: null, error: null, count: 10 }),
			)
			.mockReturnValueOnce(
				mockQuery({ data: null, error: null, count: 2 }),
			)
			.mockReturnValueOnce(
				mockQuery({ data: null, error: null, count: 1 }),
			);

		// Ticket counts (6 queries)
		mockedFrom
			.mockReturnValueOnce(
				mockQuery({ data: null, error: null, count: 5 }),
			)
			.mockReturnValueOnce(
				mockQuery({ data: null, error: null, count: 3 }),
			)
			.mockReturnValueOnce(
				mockQuery({ data: null, error: null, count: 1 }),
			)
			.mockReturnValueOnce(
				mockQuery({ data: null, error: null, count: 2 }),
			)
			.mockReturnValueOnce(
				mockQuery({ data: null, error: null, count: 1 }),
			)
			.mockReturnValueOnce(
				mockQuery({ data: null, error: null, count: 1 }),
			);

		// Products query fails
		mockedFrom.mockReturnValueOnce(
			mockQuery({ data: null, error: { message: "table not found" } }),
		);

		// Recent activity (2 queries)
		mockedFrom
			.mockReturnValueOnce(
				mockQuery({ data: null, error: null, count: 1 }),
			)
			.mockReturnValueOnce(
				mockQuery({ data: null, error: null, count: 0 }),
			);

		const result = await client.callTool({
			name: "get_summary",
			arguments: {},
		});

		const parsed = getToolJson(result);

		// Customer and ticket counts should still work
		expect(parsed.customers.total).toBe(13);
		expect(parsed.tickets.total).toBe(8);

		// Products should show error fallback
		expect(parsed.products.total_value).toBe("Error loading product data");
		expect(parsed.products.by_category).toEqual([]);

		// Recent activity should still work
		expect(parsed.recent_activity.customers_created_this_week).toBe(1);
	});

	it("returns partial data with errors array when some sections throw", async () => {
		// Customer counts throw (3 queries that never happen)
		// We make the first 3 mocks throw to simulate fetchCustomerCounts failing
		mockedFrom
			.mockReturnValueOnce(
				mockQuery({ data: null, error: { message: "customers table locked" } }),
			)
			.mockReturnValueOnce(
				mockQuery({ data: null, error: null, count: 0 }),
			)
			.mockReturnValueOnce(
				mockQuery({ data: null, error: null, count: 0 }),
			);

		// Ticket counts succeed (6 queries)
		mockedFrom
			.mockReturnValueOnce(
				mockQuery({ data: null, error: null, count: 5 }),
			)
			.mockReturnValueOnce(
				mockQuery({ data: null, error: null, count: 3 }),
			)
			.mockReturnValueOnce(
				mockQuery({ data: null, error: null, count: 1 }),
			)
			.mockReturnValueOnce(
				mockQuery({ data: null, error: null, count: 2 }),
			)
			.mockReturnValueOnce(
				mockQuery({ data: null, error: null, count: 1 }),
			)
			.mockReturnValueOnce(
				mockQuery({ data: null, error: null, count: 1 }),
			);

		// Products succeed
		mockedFrom.mockReturnValueOnce(
			mockQuery({
				data: [{ price_cents: 1000, category: "tools" }],
				error: null,
			}),
		);

		// Recent activity succeed (2 queries)
		mockedFrom
			.mockReturnValueOnce(
				mockQuery({ data: null, error: null, count: 1 }),
			)
			.mockReturnValueOnce(
				mockQuery({ data: null, error: null, count: 0 }),
			);

		const result = await client.callTool({
			name: "get_summary",
			arguments: {},
		});

		const parsed = getToolJson(result);

		// Tickets, products, recent_activity should still be present
		expect(parsed.tickets.total).toBe(8);
		expect(parsed.products.total_value).toBe("$10.00");
		expect(parsed.recent_activity.customers_created_this_week).toBe(1);
		expect(Array.isArray(parsed.errors)).toBe(true);
		expect(parsed.errors[0]).toContain("customers");
	});
});

describe("aggregateByCategory", () => {
	it("groups products by category and formats prices", () => {
		const products = [
			{ price_cents: 4900, category: "subscription" },
			{ price_cents: 14900, category: "subscription" },
			{ price_cents: 2900, category: "add-on" },
		];

		const result = aggregateByCategory(products);

		expect(result).toHaveLength(2);
		const sub = result.find((r) => r.category === "subscription");
		const addon = result.find((r) => r.category === "add-on");
		expect(sub?.value).toBe("$198.00");
		expect(addon?.value).toBe("$29.00");
	});

	it("returns empty array for no products", () => {
		expect(aggregateByCategory([])).toEqual([]);
	});

	it("handles single category", () => {
		const products = [
			{ price_cents: 1000, category: "tools" },
			{ price_cents: 2000, category: "tools" },
		];

		const result = aggregateByCategory(products);
		expect(result).toHaveLength(1);
		expect(result[0].value).toBe("$30.00");
	});
});
