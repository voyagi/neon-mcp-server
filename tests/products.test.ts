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

describe("list_products", () => {
	it("returns formatted products with price display", async () => {
		const products = [
			{
				id: "p1",
				name: "Starter Plan",
				category: "subscription",
				price_cents: 4900,
				description: "Basic plan",
				created_at: "2026-01-01",
			},
		];
		mockedFrom.mockReturnValue(mockQuery({ data: products, error: null }));

		const result = await client.callTool({
			name: "list_products",
			arguments: {},
		});

		const parsed = JSON.parse((result.content as any)[0].text);
		expect(parsed.count).toBe(1);
		expect(parsed.results[0].price_display).toBe("$49.00");
		expect(parsed.results[0].price_cents).toBe(4900);
	});

	it("handles database error", async () => {
		mockedFrom.mockReturnValue(
			mockQuery({ data: null, error: { message: "timeout" } }),
		);

		const result = await client.callTool({
			name: "list_products",
			arguments: {},
		});

		const text = (result.content as any)[0].text;
		expect(text).toContain("Database error");
	});
});

describe("search_products", () => {
	it("returns matching products", async () => {
		const products = [
			{
				id: "p2",
				name: "Enterprise Plan",
				category: "subscription",
				price_cents: 49900,
				description: "Full features",
				created_at: "2026-01-01",
			},
		];
		mockedFrom.mockReturnValue(mockQuery({ data: products, error: null }));

		const result = await client.callTool({
			name: "search_products",
			arguments: { query: "enterprise" },
		});

		const parsed = JSON.parse((result.content as any)[0].text);
		expect(parsed.count).toBe(1);
		expect(parsed.results[0].name).toBe("Enterprise Plan");
		expect(parsed.results[0].price_display).toBe("$499.00");
	});

	it("returns empty with message when no matches", async () => {
		mockedFrom.mockReturnValue(mockQuery({ data: [], error: null }));

		const result = await client.callTool({
			name: "search_products",
			arguments: { query: "nonexistent" },
		});

		const parsed = JSON.parse((result.content as any)[0].text);
		expect(parsed.count).toBe(0);
		expect(parsed.message).toContain("nonexistent");
	});
});
