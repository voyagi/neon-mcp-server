import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDbMock, getToolJson, getToolText } from "./helpers/mock-db.js";

vi.mock("../src/lib/db.js", () => createDbMock());

import { sql } from "../src/lib/db.js";
import { createServer } from "../src/server.js";

const mockedSql = vi.mocked(sql);

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
		mockedSql.mockResolvedValueOnce(products);

		const result = await client.callTool({
			name: "list_products",
			arguments: {},
		});

		const parsed = getToolJson(result);
		expect(parsed.count).toBe(1);
		const first = (parsed.results as Record<string, unknown>[])[0];
		expect(first.price_display).toBe("$49.00");
		expect(first.price_cents).toBe(4900);
	});

	it("handles database error", async () => {
		mockedSql.mockRejectedValueOnce(new Error("timeout"));

		const result = await client.callTool({
			name: "list_products",
			arguments: {},
		});

		const text = getToolText(result);
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
		mockedSql.mockResolvedValueOnce(products);

		const result = await client.callTool({
			name: "search_products",
			arguments: { query: "enterprise" },
		});

		const parsed = getToolJson(result);
		expect(parsed.count).toBe(1);
		const first = (parsed.results as Record<string, unknown>[])[0];
		expect(first.name).toBe("Enterprise Plan");
		expect(first.price_display).toBe("$499.00");
	});

	it("returns empty with message when no matches", async () => {
		mockedSql.mockResolvedValueOnce([]);

		const result = await client.callTool({
			name: "search_products",
			arguments: { query: "nonexistent" },
		});

		const parsed = getToolJson(result);
		expect(parsed.count).toBe(0);
		expect(parsed.message).toContain("nonexistent");
	});

	it("safely handles query with special characters", async () => {
		mockedSql.mockResolvedValueOnce([]);

		const result = await client.callTool({
			name: "search_products",
			arguments: { query: "name.ilike.%admin%" },
		});

		const parsed = getToolJson(result);
		expect(parsed.count).toBe(0);
	});
});
