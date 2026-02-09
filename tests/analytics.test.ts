import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock, mockQuery } from "./helpers/mock-supabase.js";

vi.mock("../src/lib/supabase.js", () => createSupabaseMock());

import { supabase } from "../src/lib/supabase.js";
import { createServer } from "../src/server.js";

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

		const parsed = JSON.parse((result.content as any)[0].text);

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

		const text = (result.content as any)[0].text;
		expect(text).toContain("Error fetching summary");
	});
});
