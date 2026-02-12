import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock } from "./helpers/mock-supabase.js";

vi.mock("../src/lib/supabase.js", () => createSupabaseMock());

import { createServer } from "../src/server.js";

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

describe("server registration", () => {
	const expectedTools = [
		"list_customers",
		"get_customer",
		"create_customer",
		"update_customer",
		"list_tickets",
		"get_ticket",
		"create_ticket",
		"close_ticket",
		"list_products",
		"search_products",
		"get_summary",
	];

	it("registers all 11 tools", async () => {
		const { tools } = await client.listTools();
		const toolNames = tools.map((t) => t.name);

		expect(tools).toHaveLength(expectedTools.length);
		for (const name of expectedTools) {
			expect(toolNames).toContain(name);
		}
	});

	it("every tool has a description", async () => {
		const { tools } = await client.listTools();

		for (const tool of tools) {
			expect(tool.description, `${tool.name} missing description`).toBeTruthy();
		}
	});

	it("registers the schema resource", async () => {
		const { resources } = await client.listResources();

		expect(resources).toHaveLength(1);
		expect(resources[0].uri).toBe("schema://tables");
		expect(resources[0].mimeType).toBe("application/json");
	});
});
