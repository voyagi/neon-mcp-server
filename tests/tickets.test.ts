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
				customers: { name: "Alice" },
			},
		];
		mockedFrom.mockReturnValue(mockQuery({ data: tickets, error: null }));

		const result = await client.callTool({
			name: "list_tickets",
			arguments: {},
		});

		const parsed = getToolJson(result);
		expect(parsed.count).toBe(1);
		expect(parsed.results[0].customer_name).toBe("Alice");
	});

	it("resolves customer by name before querying tickets", async () => {
		// First call: findCustomersByName
		mockedFrom.mockReturnValueOnce(
			mockQuery({
				data: [{ id: "c1", name: "Alice Chen" }],
				error: null,
			}),
		);
		// Second call: ticket query
		mockedFrom.mockReturnValueOnce(
			mockQuery({
				data: [
					{
						id: "t1",
						subject: "Help",
						status: "open",
						priority: "medium",
						customer_id: "c1",
						customers: { name: "Alice Chen" },
					},
				],
				error: null,
			}),
		);

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

		mockedFrom.mockReturnValue(
			mockQuery({
				data: {
					id: ticketId,
					subject: "Login broken",
					status: "open",
					priority: "high",
					customers: {
						id: "c1",
						name: "Alice",
						email: "alice@test.com",
						company: "Acme",
					},
				},
				error: null,
			}),
		);

		const result = await client.callTool({
			name: "get_ticket",
			arguments: { id: ticketId },
		});

		const parsed = getToolJson(result);
		expect(parsed.subject).toBe("Login broken");
		expect(parsed.customer.name).toBe("Alice");
		expect(parsed.customer.company).toBe("Acme");
		expect(parsed.customers).toBeUndefined();
	});

	it("returns not found for missing ticket", async () => {
		const ticketId = "abc00000-0000-0000-0000-000000000999";

		mockedFrom.mockReturnValue(
			mockQuery({
				data: null,
				error: { message: "not found" },
			}),
		);

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
		mockedFrom.mockReturnValueOnce(
			mockQuery({ data: { id: customerId }, error: null }),
		);
		// Second call: ticket insert
		mockedFrom.mockReturnValueOnce(
			mockQuery({
				data: [
					{
						id: "t-new",
						customer_id: customerId,
						subject: "New issue",
						status: "open",
					},
				],
				error: null,
			}),
		);

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
		// findCustomersByName returns multiple
		mockedFrom.mockReturnValueOnce(
			mockQuery({
				data: [
					{ id: "c1", name: "Alice Chen" },
					{ id: "c2", name: "Alice Wang" },
				],
				error: null,
			}),
		);

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

		// Update with .neq("status","closed") returns the updated row
		mockedFrom.mockReturnValueOnce(
			mockQuery({
				data: [
					{
						id: ticketId,
						status: "closed",
						resolution: "Fixed the bug",
					},
				],
				error: null,
			}),
		);

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

		// Update returns empty (no rows matched .neq filter)
		mockedFrom.mockReturnValueOnce(
			mockQuery({ data: [], error: null }),
		);
		// Disambiguation read returns closed status
		mockedFrom.mockReturnValueOnce(
			mockQuery({
				data: { status: "closed", closed_at: "2026-01-01" },
				error: null,
			}),
		);

		const result = await client.callTool({
			name: "close_ticket",
			arguments: { id: ticketId },
		});

		const text = getToolText(result);
		expect(text).toContain("already closed");
	});

	it("returns not found when ticket does not exist", async () => {
		const ticketId = "abc00000-0000-0000-0000-000000000999";

		// Update returns empty
		mockedFrom.mockReturnValueOnce(
			mockQuery({ data: [], error: null }),
		);
		// Disambiguation read returns error (not found)
		mockedFrom.mockReturnValueOnce(
			mockQuery({ data: null, error: { message: "not found" } }),
		);

		const result = await client.callTool({
			name: "close_ticket",
			arguments: { id: ticketId },
		});

		const text = getToolText(result);
		expect(text).toContain("not found");
	});
});

describe("get_ticket error discrimination", () => {
	it("returns not found for PGRST116 error", async () => {
		const ticketId = "abc00000-0000-0000-0000-000000000999";

		mockedFrom.mockReturnValue(
			mockQuery({
				data: null,
				error: { message: "not found", code: "PGRST116" },
			}),
		);

		const result = await client.callTool({
			name: "get_ticket",
			arguments: { id: ticketId },
		});

		const text = getToolText(result);
		expect(text).toContain("not found");
	});

	it("returns database error for non-PGRST116 errors", async () => {
		const ticketId = "abc00000-0000-0000-0000-000000000001";

		mockedFrom.mockReturnValue(
			mockQuery({
				data: null,
				error: { message: "connection timeout", code: "PGRST000" },
			}),
		);

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

		// Customer existence check passes
		mockedFrom.mockReturnValueOnce(
			mockQuery({ data: { id: customerId }, error: null }),
		);
		// Insert fails with FK violation
		mockedFrom.mockReturnValueOnce(
			mockQuery({
				data: null,
				error: { message: "violates foreign key", code: "23503" },
			}),
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

		// Customer existence check
		mockedFrom.mockReturnValueOnce(
			mockQuery({ data: { id: customerId }, error: null }),
		);
		// Insert returns empty array
		mockedFrom.mockReturnValueOnce(
			mockQuery({ data: [], error: null }),
		);

		const result = await client.callTool({
			name: "create_ticket",
			arguments: { customer_id: customerId, subject: "Help" },
		});

		const text = getToolText(result);
		expect(text).toContain("Ticket created but could not be retrieved");
	});
});
