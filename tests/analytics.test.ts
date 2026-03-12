import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDbMock, getToolJson, getToolText } from "./helpers/mock-db.js";

vi.mock("../src/lib/db.js", () => createDbMock());

import { query, sql } from "../src/lib/db.js";
import { createServer } from "../src/server.js";
import { aggregateByCategory } from "../src/tools/analytics.js";

const mockedSql = vi.mocked(sql);
const mockedQuery = vi.mocked(query);

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
		// countWhere uses query() — 3 customer + 6 ticket + 2 recent = 11 calls
		mockedQuery
			.mockResolvedValueOnce([{ count: 15 }]) // active customers
			.mockResolvedValueOnce([{ count: 4 }]) // inactive customers
			.mockResolvedValueOnce([{ count: 3 }]) // lead customers
			.mockResolvedValueOnce([{ count: 14 }]) // open tickets
			.mockResolvedValueOnce([{ count: 9 }]) // closed tickets
			.mockResolvedValueOnce([{ count: 3 }]) // urgent tickets
			.mockResolvedValueOnce([{ count: 5 }]) // high tickets
			.mockResolvedValueOnce([{ count: 4 }]) // medium tickets
			.mockResolvedValueOnce([{ count: 2 }]) // low tickets
			.mockResolvedValueOnce([{ count: 2 }]) // recent customers
			.mockResolvedValueOnce([{ count: 1 }]); // recent closed tickets

		// fetchProductStats uses sql tagged template — 1 call
		mockedSql.mockResolvedValueOnce([
			{ price_cents: 4900, category: "subscription" },
			{ price_cents: 14900, category: "subscription" },
			{ price_cents: 2900, category: "add-on" },
		]);

		const result = await client.callTool({
			name: "get_summary",
			arguments: {},
		});

		const parsed = getToolJson(result);

		const customers = parsed.customers as Record<string, unknown>;
		expect(customers.active).toBe(15);
		expect(customers.inactive).toBe(4);
		expect(customers.leads).toBe(3);
		expect(customers.total).toBe(22);

		const tickets = parsed.tickets as Record<string, unknown>;
		expect(tickets.open).toBe(14);
		expect(tickets.closed).toBe(9);
		const byPriority = tickets.by_priority as Record<string, unknown>;
		expect(byPriority.urgent).toBe(3);

		const products = parsed.products as Record<string, unknown>;
		expect(products.total_value).toBe("$227.00");
		expect(products.by_category).toHaveLength(2);

		const recent = parsed.recent_activity as Record<string, unknown>;
		expect(recent.customers_created_this_week).toBe(2);
		expect(recent.tickets_closed_this_week).toBe(1);
	});

	it("handles query errors gracefully", async () => {
		mockedQuery.mockRejectedValue(new Error("database unavailable"));
		mockedSql.mockRejectedValue(new Error("database unavailable"));

		const result = await client.callTool({
			name: "get_summary",
			arguments: {},
		});

		const parsed = getToolJson(result);
		// Products section has its own try/catch so it returns fallback data
		const products = parsed.products as Record<string, unknown>;
		expect(products.total_value).toBe("Error loading product data");
		// Other sections fail via Promise.allSettled
		expect(Array.isArray(parsed.errors)).toBe(true);
		expect((parsed.errors as string[]).length).toBeGreaterThanOrEqual(3);
	});

	it("returns partial results when products query fails", async () => {
		// countWhere uses query() — 3 customer + 6 ticket + 2 recent = 11 calls
		mockedQuery
			.mockResolvedValueOnce([{ count: 10 }])
			.mockResolvedValueOnce([{ count: 2 }])
			.mockResolvedValueOnce([{ count: 1 }])
			.mockResolvedValueOnce([{ count: 5 }])
			.mockResolvedValueOnce([{ count: 3 }])
			.mockResolvedValueOnce([{ count: 1 }])
			.mockResolvedValueOnce([{ count: 2 }])
			.mockResolvedValueOnce([{ count: 1 }])
			.mockResolvedValueOnce([{ count: 1 }])
			.mockResolvedValueOnce([{ count: 1 }])
			.mockResolvedValueOnce([{ count: 0 }]);

		// Products query fails (sql tagged template)
		mockedSql.mockRejectedValueOnce(new Error("table not found"));

		const result = await client.callTool({
			name: "get_summary",
			arguments: {},
		});

		const parsed = getToolJson(result);

		const customers = parsed.customers as Record<string, unknown>;
		expect(customers.total).toBe(13);
		const tickets = parsed.tickets as Record<string, unknown>;
		expect(tickets.total).toBe(8);

		// Products should show error fallback
		const products = parsed.products as Record<string, unknown>;
		expect(products.total_value).toBe("Error loading product data");
		expect(products.by_category).toEqual([]);

		const recent = parsed.recent_activity as Record<string, unknown>;
		expect(recent.customers_created_this_week).toBe(1);
	});

	it("returns partial data with errors array when some sections throw", async () => {
		// countWhere uses query() — first customer query throws, rest succeed
		mockedQuery
			.mockRejectedValueOnce(new Error("customers table locked"))
			.mockResolvedValueOnce([{ count: 0 }])
			.mockResolvedValueOnce([{ count: 0 }])
			// Ticket counts (6 queries)
			.mockResolvedValueOnce([{ count: 5 }])
			.mockResolvedValueOnce([{ count: 3 }])
			.mockResolvedValueOnce([{ count: 1 }])
			.mockResolvedValueOnce([{ count: 2 }])
			.mockResolvedValueOnce([{ count: 1 }])
			.mockResolvedValueOnce([{ count: 1 }])
			// Recent activity (2 queries)
			.mockResolvedValueOnce([{ count: 1 }])
			.mockResolvedValueOnce([{ count: 0 }]);

		// Products succeed (sql tagged template)
		mockedSql.mockResolvedValueOnce([{ price_cents: 1000, category: "tools" }]);

		const result = await client.callTool({
			name: "get_summary",
			arguments: {},
		});

		const parsed = getToolJson(result);

		const tickets = parsed.tickets as Record<string, unknown>;
		expect(tickets.total).toBe(8);
		const products = parsed.products as Record<string, unknown>;
		expect(products.total_value).toBe("$10.00");
		const recent = parsed.recent_activity as Record<string, unknown>;
		expect(recent.customers_created_this_week).toBe(1);
		expect(Array.isArray(parsed.errors)).toBe(true);
		expect((parsed.errors as string[])[0]).toContain("customers");
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
