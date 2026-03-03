// Exposes the TechStart CRM database schema as an MCP resource,
// allowing Claude to understand table structure, columns, constraints,
// and relationships without querying the database directly.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
	CUSTOMER_STATUSES,
	TICKET_PRIORITIES,
	TICKET_STATUSES,
} from "../lib/validation.js";

/** Generates a SQL CHECK constraint expression: column IN ('val1', 'val2', ...) */
function checkIn(column: string, values: readonly string[]): string {
	return `${column} IN (${values.map((v) => `'${v}'`).join(", ")})`;
}

interface SchemaColumn {
	name: string;
	type: string;
	nullable: boolean;
	default: string | null;
	description: string;
}

interface SchemaConstraint {
	type: string;
	columns: string[];
	expression?: string;
	references?: {
		table: string;
		column: string;
		onDelete: string;
	};
}

interface SchemaRelationship {
	from: string;
	to: string;
	type: string;
	description: string;
}

interface SchemaTable {
	name: string;
	description: string;
	columns: SchemaColumn[];
	constraints: SchemaConstraint[];
	relationships: SchemaRelationship[];
}

interface DatabaseSchema {
	description: string;
	tables: SchemaTable[];
}

// Schema is intentionally defined as static TypeScript for this demo.
// If the database schema changes, update these definitions manually.
const customersTable: SchemaTable = {
	name: "customers",
	description: "Customer records for the business",
	columns: [
		{
			name: "id",
			type: "uuid",
			nullable: false,
			default: "gen_random_uuid()",
			description: "Unique customer identifier",
		},
		{
			name: "name",
			type: "text",
			nullable: false,
			default: null,
			description: "Customer full name",
		},
		{
			name: "email",
			type: "text",
			nullable: false,
			default: null,
			description: "Customer email address (unique)",
		},
		{
			name: "company",
			type: "text",
			nullable: true,
			default: null,
			description: "Company the customer belongs to",
		},
		{
			name: "status",
			type: "text",
			nullable: false,
			default: "'active'",
			description: `Customer status. Valid values: ${CUSTOMER_STATUSES.join(", ")}`,
		},
		{
			name: "created_at",
			type: "timestamptz",
			nullable: true,
			default: "now()",
			description: "When the customer was created",
		},
	],
	constraints: [
		{ type: "PRIMARY KEY", columns: ["id"] },
		{ type: "UNIQUE", columns: ["email"] },
		{
			type: "CHECK",
			columns: ["status"],
			expression: checkIn("status", CUSTOMER_STATUSES),
		},
	],
	relationships: [],
};

const productsTable: SchemaTable = {
	name: "products",
	description: "Product catalog with pricing",
	columns: [
		{
			name: "id",
			type: "uuid",
			nullable: false,
			default: "gen_random_uuid()",
			description: "Unique product identifier",
		},
		{
			name: "name",
			type: "text",
			nullable: false,
			default: null,
			description: "Product name",
		},
		{
			name: "category",
			type: "text",
			nullable: false,
			default: null,
			description: "Product category for grouping",
		},
		{
			name: "price_cents",
			type: "integer",
			nullable: false,
			default: null,
			description:
				"Product price in cents - divide by 100 for dollar amount (e.g., 2999 = $29.99)",
		},
		{
			name: "description",
			type: "text",
			nullable: true,
			default: null,
			description: "Product description",
		},
		{
			name: "created_at",
			type: "timestamptz",
			nullable: true,
			default: "now()",
			description: "When the product was added to the catalog",
		},
	],
	constraints: [{ type: "PRIMARY KEY", columns: ["id"] }],
	relationships: [],
};

const ticketsTable: SchemaTable = {
	name: "tickets",
	description: "Support tickets linked to customers",
	columns: [
		{
			name: "id",
			type: "uuid",
			nullable: false,
			default: "gen_random_uuid()",
			description: "Unique ticket identifier",
		},
		{
			name: "customer_id",
			type: "uuid",
			nullable: true,
			default: null,
			description:
				"References customers.id - the customer who submitted this ticket",
		},
		{
			name: "subject",
			type: "text",
			nullable: false,
			default: null,
			description: "Brief summary of the support issue",
		},
		{
			name: "description",
			type: "text",
			nullable: true,
			default: null,
			description: "Detailed description of the issue",
		},
		{
			name: "status",
			type: "text",
			nullable: false,
			default: "'open'",
			description: `Ticket status. Valid values: ${TICKET_STATUSES.join(", ")}`,
		},
		{
			name: "priority",
			type: "text",
			nullable: false,
			default: "'medium'",
			description: `Ticket priority level. Valid values: ${TICKET_PRIORITIES.join(", ")}`,
		},
		{
			name: "created_at",
			type: "timestamptz",
			nullable: true,
			default: "now()",
			description: "When the ticket was created",
		},
		{
			name: "closed_at",
			type: "timestamptz",
			nullable: true,
			default: null,
			description: "When the ticket was closed/resolved (null if still open)",
		},
		{
			name: "resolution",
			type: "text",
			nullable: true,
			default: null,
			description:
				"Resolution note explaining how the ticket was resolved (set when closing)",
		},
	],
	constraints: [
		{ type: "PRIMARY KEY", columns: ["id"] },
		{
			type: "CHECK",
			columns: ["status"],
			expression: checkIn("status", TICKET_STATUSES),
		},
		{
			type: "CHECK",
			columns: ["priority"],
			expression: checkIn("priority", TICKET_PRIORITIES),
		},
		{
			type: "FOREIGN KEY",
			columns: ["customer_id"],
			references: {
				table: "customers",
				column: "id",
				onDelete: "CASCADE",
			},
		},
	],
	relationships: [
		{
			from: "customer_id",
			to: "customers.id",
			type: "many-to-one",
			description:
				"Each ticket belongs to one customer. A customer can have many tickets.",
		},
	],
};

/** Assembles the complete database schema definition for all CRM tables */
function buildSchema(): DatabaseSchema {
	return {
		description:
			"TechStart CRM database schema - a small business CRM with customers, support tickets, and products",
		tables: [customersTable, productsTable, ticketsTable],
	};
}

export function registerSchemaResource(server: McpServer): void {
	server.resource(
		"schema-tables",
		"schema://tables",
		{
			description:
				"Complete schema for all TechStart CRM database tables including columns, types, constraints, and relationships",
			mimeType: "application/json",
		},
		async (uri: URL) => ({
			contents: [
				{
					uri: uri.href,
					mimeType: "application/json",
					text: JSON.stringify(buildSchema(), null, 2),
				},
			],
		}),
	);
}
