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

const mockedFrom = vi.mocked(supabase.from);

// Call a tool on the server by creating a connected client
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
		mockedFrom.mockReturnValue(
			mockQuery({ data: customers, error: null }),
		);

		const result = await client.callTool({
			name: "list_customers",
			arguments: {},
		});

		const parsed = getToolJson(result);
		expect(parsed.count).toBe(2);
		expect(parsed.results).toHaveLength(2);
		expect(parsed.results[0].name).toBe("Alice");
	});

	it("returns empty results message when none match", async () => {
		mockedFrom.mockReturnValue(mockQuery({ data: [], error: null }));

		const result = await client.callTool({
			name: "list_customers",
			arguments: { status: "inactive" },
		});

		const parsed = getToolJson(result);
		expect(parsed.count).toBe(0);
		expect(parsed.message).toContain("No customers");
	});

	it("returns error on database failure", async () => {
		mockedFrom.mockReturnValue(
			mockQuery({ data: null, error: { message: "connection lost" } }),
		);

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

		mockedFrom
			.mockReturnValueOnce(
				mockQuery({ data: customer, error: null }),
			)
			.mockReturnValueOnce(
				mockQuery({ data: null, error: null, count: 5 }),
			)
			.mockReturnValueOnce(
				mockQuery({ data: null, error: null, count: 2 }),
			)
			.mockReturnValueOnce(
				mockQuery({ data: [{ subject: "Test", status: "open", created_at: "2026-01-01" }], error: null }),
			);

		const result = await client.callTool({
			name: "get_customer",
			arguments: { id: "abc00000-0000-0000-0000-000000000123" },
		});

		const parsed = getToolJson(result);
		expect(parsed.name).toBe("Alice");
		expect(parsed.total_tickets_count).toBe(5);
		expect(parsed.open_tickets_count).toBe(2);
	});

	it("returns not found for PGRST116 error", async () => {
		mockedFrom.mockReturnValue(
			mockQuery({
				data: null,
				error: { message: "not found", code: "PGRST116" },
			}),
		);

		const result = await client.callTool({
			name: "get_customer",
			arguments: { id: "abc00000-0000-0000-0000-000000000999" },
		});

		const text = getToolText(result);
		expect(text).toContain("not found");
	});

	it("returns database error for non-PGRST116 errors", async () => {
		mockedFrom.mockReturnValue(
			mockQuery({
				data: null,
				error: { message: "connection timeout", code: "PGRST000" },
			}),
		);

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
		mockedFrom.mockReturnValue(
			mockQuery({ data: [newCustomer], error: null }),
		);

		const result = await client.callTool({
			name: "create_customer",
			arguments: { name: "Charlie", email: "c@test.com" },
		});

		const parsed = getToolJson(result);
		expect(parsed.name).toBe("Charlie");
	});

	it("handles duplicate email", async () => {
		mockedFrom.mockReturnValue(
			mockQuery({
				data: null,
				error: { message: "duplicate key", code: "23505" },
			}),
		);

		const result = await client.callTool({
			name: "create_customer",
			arguments: { name: "Charlie", email: "existing@test.com" },
		});

		const text = getToolText(result);
		expect(text).toContain("already exists");
	});

	it("handles empty data array from insert", async () => {
		mockedFrom.mockReturnValue(
			mockQuery({ data: [], error: null }),
		);

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
		mockedFrom.mockReturnValue(
			mockQuery({ data: [updated], error: null }),
		);

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
