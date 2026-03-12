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

describe("list_tickets", () => {
	it("returns all tickets", async () => {
		const tickets = [
			{
				id: "t1",
				subject: "Bug report",
				status: "open",
				priority: "high",
				customer_name: "Alice",
			},
		];
		mockedQuery.mockResolvedValueOnce(tickets);

		const result = await client.callTool({
			name: "list_tickets",
			arguments: {},
		});

		const parsed = getToolJson(result);
		expect(parsed.count).toBe(1);
		expect(
			(parsed.results as { customer_name: string }[])[0].customer_name,
		).toBe("Alice");
	});

	it("resolves customer by name before querying tickets", async () => {
		// First call: findCustomersByName (tagged template)
		mockedSql.mockResolvedValueOnce([{ id: "c1", name: "Alice Chen" }]);
		// Second call: ticket query (dynamic SQL via query())
		mockedQuery.mockResolvedValueOnce([
			{
				id: "t1",
				subject: "Help",
				status: "open",
				priority: "medium",
				customer_id: "c1",
				customer_name: "Alice Chen",
			},
		]);

		const result = await client.callTool({
			name: "list_tickets",
			arguments: { customer_name: "Alice" },
		});

		const parsed = getToolJson(result);
		expect(parsed.count).toBe(1);
	});
});

describe("get_ticket", () => {
	it("returns ticket with customer info", async () => {
		const ticketId = "abc00000-0000-0000-0000-000000000001";

		mockedSql.mockResolvedValueOnce([
			{
				id: ticketId,
				subject: "Login broken",
				status: "open",
				priority: "high",
				c_id: "c1",
				c_name: "Alice",
				c_email: "alice@test.com",
				c_company: "Acme",
			},
		]);

		const result = await client.callTool({
			name: "get_ticket",
			arguments: { id: ticketId },
		});

		const parsed = getToolJson(result);
		expect(parsed.subject).toBe("Login broken");
		const customer = parsed.customer as Record<string, unknown>;
		expect(customer.name).toBe("Alice");
		expect(customer.company).toBe("Acme");
		expect(parsed.c_id).toBeUndefined();
	});

	it("returns not found for missing ticket", async () => {
		const ticketId = "abc00000-0000-0000-0000-000000000999";
		mockedSql.mockResolvedValueOnce([]);

		const result = await client.callTool({
			name: "get_ticket",
			arguments: { id: ticketId },
		});

		const text = getToolText(result);
		expect(text).toContain("not found");
	});
});

describe("create_ticket", () => {
	it("creates ticket with customer_id", async () => {
		const customerId = "abc00000-0000-0000-0000-000000000001";

		// First call: customer existence check
		mockedSql.mockResolvedValueOnce([{ id: customerId }]);
		// Second call: ticket insert
		mockedSql.mockResolvedValueOnce([
			{
				id: "t-new",
				customer_id: customerId,
				subject: "New issue",
				status: "open",
			},
		]);

		const result = await client.callTool({
			name: "create_ticket",
			arguments: {
				customer_id: customerId,
				subject: "New issue",
			},
		});

		const parsed = getToolJson(result);
		expect(parsed.subject).toBe("New issue");
	});

	it("requires customer_id or customer_name", async () => {
		const result = await client.callTool({
			name: "create_ticket",
			arguments: { subject: "Orphan ticket" },
		});

		const text = getToolText(result);
		expect(text).toContain("customer_id or customer_name");
	});

	it("errors on multiple customer matches", async () => {
		mockedSql.mockResolvedValueOnce([
			{ id: "c1", name: "Alice Chen" },
			{ id: "c2", name: "Alice Wang" },
		]);

		const result = await client.callTool({
			name: "create_ticket",
			arguments: { customer_name: "Alice", subject: "Help" },
		});

		const parsed = getToolJson(result);
		expect(parsed.error).toContain("Multiple customers");
		expect(parsed.matches).toHaveLength(2);
	});
});

describe("close_ticket", () => {
	it("closes an open ticket", async () => {
		const ticketId = "abc00000-0000-0000-0000-000000000001";

		mockedSql.mockResolvedValueOnce([
			{
				id: ticketId,
				status: "closed",
				resolution: "Fixed the bug",
			},
		]);

		const result = await client.callTool({
			name: "close_ticket",
			arguments: { id: ticketId, resolution: "Fixed the bug" },
		});

		const parsed = getToolJson(result);
		expect(parsed.status).toBe("closed");
		expect(parsed.resolution).toBe("Fixed the bug");
	});

	it("rejects closing an already-closed ticket", async () => {
		const ticketId = "abc00000-0000-0000-0000-000000000001";

		mockedSql.mockResolvedValueOnce([]);
		mockedSql.mockResolvedValueOnce([
			{ status: "closed", closed_at: "2026-01-01" },
		]);

		const result = await client.callTool({
			name: "close_ticket",
			arguments: { id: ticketId },
		});

		const text = getToolText(result);
		expect(text).toContain("already closed");
	});

	it("returns not found when ticket does not exist", async () => {
		const ticketId = "abc00000-0000-0000-0000-000000000999";

		mockedSql.mockResolvedValueOnce([]);
		mockedSql.mockResolvedValueOnce([]);

		const result = await client.callTool({
			name: "close_ticket",
			arguments: { id: ticketId },
		});

		const text = getToolText(result);
		expect(text).toContain("not found");
	});
});

describe("get_ticket error handling", () => {
	it("returns database error on query failure", async () => {
		const ticketId = "abc00000-0000-0000-0000-000000000001";
		mockedSql.mockRejectedValueOnce(new Error("connection timeout"));

		const result = await client.callTool({
			name: "get_ticket",
			arguments: { id: ticketId },
		});

		const text = getToolText(result);
		expect(text).toContain("Database error");
		expect(text).toContain("connection timeout");
	});
});

describe("create_ticket edge cases", () => {
	it("handles FK violation when customer is deleted", async () => {
		const customerId = "abc00000-0000-0000-0000-000000000001";

		mockedSql.mockResolvedValueOnce([{ id: customerId }]);
		mockedSql.mockRejectedValueOnce(
			pgError("violates foreign key", "23503"),
		);

		const result = await client.callTool({
			name: "create_ticket",
			arguments: { customer_id: customerId, subject: "Help" },
		});

		const text = getToolText(result);
		expect(text).toContain("customer no longer exists");
	});

	it("handles empty data array from insert", async () => {
		const customerId = "abc00000-0000-0000-0000-000000000001";

		mockedSql.mockResolvedValueOnce([{ id: customerId }]);
		mockedSql.mockResolvedValueOnce([]);

		const result = await client.callTool({
			name: "create_ticket",
			arguments: { customer_id: customerId, subject: "Help" },
		});

		const text = getToolText(result);
		expect(text).toContain("Ticket created but could not be retrieved");
	});
});
