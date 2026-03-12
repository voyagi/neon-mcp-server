import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createDbMock,
	getToolJson,
	getToolText,
	pgError,
} from "./helpers/mock-db.js";

vi.mock("../src/lib/db.js", () => createDbMock());

import { query, sql } from "../src/lib/db.js";
import { createServer } from "../src/server.js";

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

describe("list_customers", () => {
	it("returns all customers when no filters given", async () => {
		const customers = [
			{ id: "1", name: "Alice", email: "a@test.com", status: "active" },
			{ id: "2", name: "Bob", email: "b@test.com", status: "lead" },
		];
		mockedQuery.mockResolvedValueOnce(customers);

		const result = await client.callTool({
			name: "list_customers",
			arguments: {},
		});

		const parsed = getToolJson(result);
		expect(parsed.count).toBe(2);
		expect(parsed.results).toHaveLength(2);
		expect((parsed.results as { name: string }[])[0].name).toBe("Alice");
	});

	it("returns empty results message when none match", async () => {
		mockedQuery.mockResolvedValueOnce([]);

		const result = await client.callTool({
			name: "list_customers",
			arguments: { status: "inactive" },
		});

		const parsed = getToolJson(result);
		expect(parsed.count).toBe(0);
		expect(parsed.message).toContain("No customers");
	});

	it("returns error on database failure", async () => {
		mockedQuery.mockRejectedValueOnce(new Error("connection lost"));

		const result = await client.callTool({
			name: "list_customers",
			arguments: {},
		});

		const text = getToolText(result);
		expect(text).toContain("Database error");
		expect(text).toContain("connection lost");
	});
});

describe("get_customer", () => {
	it("returns customer with ticket summary", async () => {
		const customer = {
			id: "abc-123",
			name: "Alice",
			email: "a@test.com",
			status: "active",
		};

		mockedSql
			.mockResolvedValueOnce([customer])
			.mockResolvedValueOnce([{ count: 5 }])
			.mockResolvedValueOnce([{ count: 2 }])
			.mockResolvedValueOnce([
				{ subject: "Test", status: "open", created_at: "2026-01-01" },
			]);

		const result = await client.callTool({
			name: "get_customer",
			arguments: { id: "abc00000-0000-0000-0000-000000000123" },
		});

		const parsed = getToolJson(result);
		expect(parsed.name).toBe("Alice");
		expect(parsed.total_tickets_count).toBe(5);
		expect(parsed.open_tickets_count).toBe(2);
	});

	it("returns not found for missing customer", async () => {
		mockedSql.mockResolvedValueOnce([]);

		const result = await client.callTool({
			name: "get_customer",
			arguments: { id: "abc00000-0000-0000-0000-000000000999" },
		});

		const text = getToolText(result);
		expect(text).toContain("not found");
	});

	it("returns database error on query failure", async () => {
		mockedSql.mockRejectedValueOnce(new Error("connection timeout"));

		const result = await client.callTool({
			name: "get_customer",
			arguments: { id: "abc00000-0000-0000-0000-000000000123" },
		});

		const text = getToolText(result);
		expect(text).toContain("Database error");
		expect(text).toContain("connection timeout");
	});
});

describe("create_customer", () => {
	it("creates a new customer", async () => {
		const newCustomer = {
			id: "new-id",
			name: "Charlie",
			email: "c@test.com",
			status: "active",
		};
		mockedSql.mockResolvedValueOnce([newCustomer]);

		const result = await client.callTool({
			name: "create_customer",
			arguments: { name: "Charlie", email: "c@test.com" },
		});

		const parsed = getToolJson(result);
		expect(parsed.name).toBe("Charlie");
	});

	it("handles duplicate email", async () => {
		mockedSql.mockRejectedValueOnce(pgError("duplicate key", "23505"));

		const result = await client.callTool({
			name: "create_customer",
			arguments: { name: "Charlie", email: "existing@test.com" },
		});

		const text = getToolText(result);
		expect(text).toContain("already exists");
	});

	it("handles empty data array from insert", async () => {
		mockedSql.mockResolvedValueOnce([]);

		const result = await client.callTool({
			name: "create_customer",
			arguments: { name: "Charlie", email: "c@test.com" },
		});

		const text = getToolText(result);
		expect(text).toContain("Customer created but could not be retrieved");
	});
});

describe("update_customer", () => {
	it("updates customer fields", async () => {
		const updated = {
			id: "abc-123",
			name: "Alice Updated",
			email: "a@test.com",
			status: "active",
		};
		mockedQuery.mockResolvedValueOnce([updated]);

		const result = await client.callTool({
			name: "update_customer",
			arguments: {
				id: "abc00000-0000-0000-0000-000000000123",
				name: "Alice Updated",
			},
		});

		const parsed = getToolJson(result);
		expect(parsed.name).toBe("Alice Updated");
	});

	it("rejects update with no fields", async () => {
		const result = await client.callTool({
			name: "update_customer",
			arguments: { id: "abc00000-0000-0000-0000-000000000123" },
		});

		const text = getToolText(result);
		expect(text).toContain("No fields");
	});
});
