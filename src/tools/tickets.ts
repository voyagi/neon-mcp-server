import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
	resolveCustomerIds,
	resolveOneCustomer,
	validateCustomerExists,
} from "../lib/customers.js";
import { query, sql } from "../lib/db.js";
import { hasErrorCode, PG_FK_VIOLATION } from "../lib/errors.js";
import {
	dbErrorResponse,
	jsonResponse,
	listResponse,
	notFoundResponse,
	textResponse,
} from "../lib/responses.js";
import { TicketPriority, TicketStatus, uuidParam } from "../lib/validation.js";

export function registerTicketTools(server: McpServer): void {
	// list_tickets tool
	server.tool(
		"list_tickets",
		"List tickets with optional filters by status, priority, customer ID, or customer name",
		{
			status: TicketStatus.optional(),
			customer_id: uuidParam("Customer ID").optional(),
			customer_name: z.string().optional(),
			priority: TicketPriority.optional(),
		},
		async (args) => {
			const { status, customer_id, customer_name, priority } = args;

			let resolvedIds: string[] | null = null;

			if (customer_name && !customer_id) {
				const result = await resolveCustomerIds(customer_name);
				if (!result.ok) return result.response;
				resolvedIds = result.customerIds;
			}

			try {
				const conditions: string[] = [];
				const values: unknown[] = [];

				if (status) {
					values.push(status);
					conditions.push(`t.status = $${values.length}`);
				}
				if (customer_id) {
					values.push(customer_id);
					conditions.push(`t.customer_id = $${values.length}`);
				} else if (resolvedIds) {
					values.push(resolvedIds);
					conditions.push(`t.customer_id = ANY($${values.length})`);
				}
				if (priority) {
					values.push(priority);
					conditions.push(`t.priority = $${values.length}`);
				}

				const where =
					conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
				const rows = await query(
					`SELECT t.*, c.name AS customer_name FROM tickets t LEFT JOIN customers c ON t.customer_id = c.id ${where} ORDER BY t.created_at DESC`,
					values,
				);

				const results = rows.map((row) => ({
					...row,
					customer_name: (row.customer_name as string) ?? "Unknown Customer",
				}));

				return listResponse(results, "No tickets match your filters");
			} catch (error) {
				return dbErrorResponse(error);
			}
		},
	);

	// get_ticket tool
	server.tool(
		"get_ticket",
		"Get ticket details including linked customer information",
		{
			id: uuidParam("Ticket ID"),
		},
		async (args) => {
			const { id } = args;

			try {
				const rows = await sql`
					SELECT t.*,
						c.id AS c_id, c.name AS c_name,
						c.email AS c_email, c.company AS c_company
					FROM tickets t
					LEFT JOIN customers c ON t.customer_id = c.id
					WHERE t.id = ${id}`;

				if (rows.length === 0) {
					return notFoundResponse("Ticket", id);
				}

				const { c_id, c_name, c_email, c_company, ...ticket } = rows[0];
				return jsonResponse({
					...ticket,
					customer: c_id
						? {
								id: c_id,
								name: c_name,
								email: c_email,
								company: c_company,
							}
						: null,
				});
			} catch (error) {
				return dbErrorResponse(error);
			}
		},
	);

	// create_ticket tool
	server.tool(
		"create_ticket",
		"Create a new support ticket. Provide customer_id or customer_name to link the ticket.",
		{
			customer_id: uuidParam("Customer ID").optional(),
			customer_name: z.string().optional(),
			subject: z.string().min(1),
			description: z.string().optional(),
			priority: TicketPriority.optional(),
		},
		async (args) => {
			const { customer_id, customer_name, subject, description, priority } =
				args;

			if (!customer_id && !customer_name) {
				return textResponse("Either customer_id or customer_name is required");
			}

			let finalCustomerId: string;

			if (customer_id) {
				const check = await validateCustomerExists(customer_id);
				if (!check.ok) return check.response;
				finalCustomerId = check.customerId;
			} else {
				const result = await resolveOneCustomer(customer_name as string);
				if (!result.ok) return result.response;
				finalCustomerId = result.customerId;
			}

			try {
				const rows = await sql`
					INSERT INTO tickets (customer_id, subject, description, priority)
					VALUES (${finalCustomerId}, ${subject}, ${description || null}, ${priority || "medium"})
					RETURNING *`;

				if (rows.length === 0) {
					return textResponse("Ticket created but could not be retrieved");
				}

				return jsonResponse(rows[0]);
			} catch (error) {
				if (hasErrorCode(error, PG_FK_VIOLATION)) {
					return textResponse(
						"Cannot create ticket: the linked customer no longer exists",
					);
				}
				return dbErrorResponse(error);
			}
		},
	);

	// close_ticket tool
	server.tool(
		"close_ticket",
		"Close a support ticket and mark it as resolved with optional resolution note",
		{
			id: uuidParam("Ticket ID"),
			resolution: z.string().optional(),
		},
		async (args) => {
			const { id, resolution } = args;

			try {
				const rows = await sql`
					UPDATE tickets
					SET status = 'closed', closed_at = ${new Date().toISOString()}, resolution = ${resolution || null}
					WHERE id = ${id} AND status != 'closed'
					RETURNING *`;

				if (rows.length === 0) {
					// Check if ticket exists and is already closed
					const check =
						await sql`SELECT status, closed_at FROM tickets WHERE id = ${id}`;

					if (check.length === 0) {
						return notFoundResponse("Ticket", id);
					}
					if (check[0].status === "closed") {
						return textResponse(
							`Ticket ${id} is already closed (closed on ${check[0].closed_at})`,
						);
					}
					return notFoundResponse("Ticket", id);
				}

				return jsonResponse(rows[0]);
			} catch (error) {
				return dbErrorResponse(error);
			}
		},
	);
}
