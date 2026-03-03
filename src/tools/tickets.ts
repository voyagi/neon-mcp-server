import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
	resolveCustomerIds,
	resolveOneCustomer,
	validateCustomerExists,
} from "../lib/customers.js";
import { PG_FK_VIOLATION, PGRST_NOT_FOUND } from "../lib/errors.js";
import {
	formatTicketListItem,
	formatTicketWithCustomer,
} from "../lib/formatters.js";
import {
	dbErrorResponse,
	jsonResponse,
	listResponse,
	notFoundResponse,
	textResponse,
} from "../lib/responses.js";
import { supabase } from "../lib/supabase.js";
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

			let query = supabase
				.from("tickets")
				.select("*, customers(name)")
				.order("created_at", { ascending: false });

			if (status) {
				query = query.eq("status", status);
			}

			if (customer_id) {
				query = query.eq("customer_id", customer_id);
			} else if (resolvedIds) {
				query = query.in("customer_id", resolvedIds);
			}

			if (priority) {
				query = query.eq("priority", priority);
			}

			const { data, error } = await query;

			if (error) {
				return dbErrorResponse(error);
			}

			const results = (data || []).map(formatTicketListItem);

			return listResponse(results, "No tickets match your filters");
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

			const { data, error } = await supabase
				.from("tickets")
				.select(
					`
					*,
					customers (
						id,
						name,
						email,
						company
					)
				`,
				)
				.eq("id", id)
				.single();

			if (error) {
				if (error.code === PGRST_NOT_FOUND) {
					return notFoundResponse("Ticket", id);
				}
				return dbErrorResponse(error);
			}
			if (!data) {
				return notFoundResponse("Ticket", id);
			}

			return jsonResponse(formatTicketWithCustomer(data));
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

			const { data, error } = await supabase
				.from("tickets")
				.insert({
					customer_id: finalCustomerId,
					subject,
					description: description || null,
					priority: priority || "medium",
				})
				.select();

			if (error) {
				if (error.code === PG_FK_VIOLATION) {
					return textResponse(
						"Cannot create ticket: the linked customer no longer exists",
					);
				}
				return dbErrorResponse(error);
			}

			if (!data || data.length === 0) {
				return textResponse("Ticket created but could not be retrieved");
			}

			return jsonResponse(data[0]);
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

			const { data, error } = await supabase
				.from("tickets")
				.update({
					status: "closed",
					closed_at: new Date().toISOString(),
					resolution: resolution || null,
				})
				.eq("id", id)
				.neq("status", "closed")
				.select();

			if (error) {
				return dbErrorResponse(error);
			}

			if (!data || data.length === 0) {
				const { data: check, error: checkError } = await supabase
					.from("tickets")
					.select("status, closed_at")
					.eq("id", id)
					.single();

				if (checkError) {
					if (checkError.code === PGRST_NOT_FOUND) {
						return notFoundResponse("Ticket", id);
					}
					return dbErrorResponse(checkError);
				}
				if (!check) {
					return notFoundResponse("Ticket", id);
				}
				if (check.status === "closed") {
					return textResponse(
						`Ticket ${id} is already closed (closed on ${check.closed_at})`,
					);
				}
				return notFoundResponse("Ticket", id);
			}

			return jsonResponse(data[0]);
		},
	);
}
