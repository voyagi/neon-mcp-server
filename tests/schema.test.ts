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

async function readSchema() {
	const result = await client.readResource({ uri: "schema://tables" });
	const text = result.contents[0].text as string;
	return JSON.parse(text);
}

describe("schema://tables resource", () => {
	it("returns valid JSON with all three tables", async () => {
		const schema = await readSchema();

		expect(schema.description).toBeTruthy();
		expect(schema.tables).toHaveLength(3);

		const tableNames = schema.tables.map((t: { name: string }) => t.name);
		expect(tableNames).toContain("customers");
		expect(tableNames).toContain("products");
		expect(tableNames).toContain("tickets");
	});

	it("customers table has expected columns", async () => {
		const schema = await readSchema();
		const customers = schema.tables.find(
			(t: { name: string }) => t.name === "customers",
		);

		const colNames = customers.columns.map((c: { name: string }) => c.name);
		expect(colNames).toContain("id");
		expect(colNames).toContain("name");
		expect(colNames).toContain("email");
		expect(colNames).toContain("company");
		expect(colNames).toContain("status");
		expect(colNames).toContain("created_at");
	});

	it("tickets table has foreign key to customers", async () => {
		const schema = await readSchema();
		const tickets = schema.tables.find(
			(t: { name: string }) => t.name === "tickets",
		);

		const fk = tickets.constraints.find(
			(c: { type: string }) => c.type === "FOREIGN KEY",
		);
		expect(fk).toBeDefined();
		expect(fk.columns).toContain("customer_id");
		expect(fk.references.table).toBe("customers");
		expect(fk.references.column).toBe("id");
	});

	it("tickets table has relationship metadata", async () => {
		const schema = await readSchema();
		const tickets = schema.tables.find(
			(t: { name: string }) => t.name === "tickets",
		);

		expect(tickets.relationships).toHaveLength(1);
		expect(tickets.relationships[0].type).toBe("many-to-one");
		expect(tickets.relationships[0].to).toBe("customers.id");
	});

	it("products table has price_cents column", async () => {
		const schema = await readSchema();
		const products = schema.tables.find(
			(t: { name: string }) => t.name === "products",
		);

		const priceCol = products.columns.find(
			(c: { name: string }) => c.name === "price_cents",
		);
		expect(priceCol).toBeDefined();
		expect(priceCol.type).toBe("integer");
		expect(priceCol.description).toContain("cents");
	});
});
