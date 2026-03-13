import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { query, sql } from "../lib/db.js";
import { hasErrorCode, PG_UNIQUE_VIOLATION } from "../lib/errors.js";
import {
	dbErrorResponse,
	jsonResponse,
	listResponse,
	notFoundResponse,
	textResponse,
} from "../lib/responses.js";
import {
	CustomerStatus,
	sanitizeLikeValue,
	uuidParam,
} from "../lib/validation.js";

export function registerCustomerTools(server: McpServer): void {
	// list_customers tool
	server.tool(
		"list_customers",
		"List all customers, optionally filter by status or company name",
		{
			status: CustomerStatus.optional(),
			company: z.string().optional(),
		},
		async (args) => {
			const { status, company } = args;

			try {
				const conditions: string[] = [];
				const values: unknown[] = [];

				if (status) {
					values.push(status);
					conditions.push(`status = $${values.length}`);
				}
				if (company) {
					values.push(`%${sanitizeLikeValue(company)}%`);
					conditions.push(`company ILIKE $${values.length}`);
				}

				const where =
					conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
				const rows = await query(
					`SELECT * FROM customers ${where} ORDER BY name`,
					values,
				);

				return listResponse(rows, "No customers match your filters");
			} catch (error) {
				return dbErrorResponse(error);
			}
		},
	);

	// get_customer tool
	server.tool(
		"get_customer",
		"Get a single customer by ID, including their ticket summary",
		{
			id: uuidParam("Customer ID"),
		},
		async (args) => {
			const { id } = args;

			try {
				const customers = await sql`SELECT * FROM customers WHERE id = ${id}`;

				if (customers.length === 0) {
					return notFoundResponse("Customer", id);
				}

				const customer = customers[0];

				const [totalResult, openResult, recentTickets] = await Promise.all([
					sql`SELECT COUNT(*)::int AS count FROM tickets WHERE customer_id = ${id}`,
					sql`SELECT COUNT(*)::int AS count FROM tickets WHERE customer_id = ${id} AND status != 'closed'`,
					sql`SELECT subject, status, created_at FROM tickets WHERE customer_id = ${id} ORDER BY created_at DESC LIMIT 3`,
				]);

				return jsonResponse({
					...customer,
					total_tickets_count: totalResult[0]?.count ?? 0,
					open_tickets_count: openResult[0]?.count ?? 0,
					recent_tickets: recentTickets,
				});
			} catch (error) {
				return dbErrorResponse(error);
			}
		},
	);

	// create_customer tool
	server.tool(
		"create_customer",
		"Create a new customer with name, email, optional company and status",
		{
			name: z.string().min(1, { error: "Customer name is required" }),
			email: z.email({ error: "Invalid email format" }),
			company: z.string().optional(),
			status: CustomerStatus.optional(),
		},
		async (args) => {
			const { name, email, company, status } = args;

			try {
				const rows = await sql`
					INSERT INTO customers (name, email, company, status)
					VALUES (${name}, ${email}, ${company || null}, ${status || "active"})
					RETURNING *`;

				if (rows.length === 0) {
					return textResponse("Customer created but could not be retrieved");
				}

				return jsonResponse(rows[0]);
			} catch (error) {
				if (hasErrorCode(error, PG_UNIQUE_VIOLATION)) {
					return textResponse(
						`A customer with email "${email}" already exists`,
					);
				}
				return dbErrorResponse(error);
			}
		},
	);

	// update_customer tool
	server.tool(
		"update_customer",
		"Update customer fields by ID. Only send the fields you want to change.",
		{
			id: uuidParam("Customer ID"),
			name: z
				.string()
				.min(1, { error: "Customer name cannot be empty" })
				.optional(),
			email: z.email({ error: "Invalid email format" }).optional(),
			company: z.string().optional(),
			status: CustomerStatus.optional(),
		},
		async (args) => {
			const { id, name, email, company, status } = args;

			const updates: Record<string, unknown> = {};
			if (name !== undefined) updates.name = name;
			if (email !== undefined) updates.email = email;
			if (company !== undefined) updates.company = company || null;
			if (status !== undefined) updates.status = status;

			if (Object.keys(updates).length === 0) {
				return textResponse("No fields provided to update");
			}

			const fields = Object.entries(updates);
			const setClauses = fields.map(([key], i) => `${key} = $${i + 1}`);
			const values = [...fields.map(([, val]) => val), id];

			try {
				const rows = await query(
					`UPDATE customers SET ${setClauses.join(", ")} WHERE id = $${fields.length + 1} RETURNING *`,
					values,
				);

				if (rows.length === 0) {
					return notFoundResponse("Customer", id);
				}

				return jsonResponse(rows[0]);
			} catch (error) {
				if (hasErrorCode(error, PG_UNIQUE_VIOLATION)) {
					const msg = email
						? `Email "${email}" is already taken by another customer`
						: "A customer with that email already exists";
					return textResponse(msg);
				}
				return dbErrorResponse(error);
			}
		},
	);
}
