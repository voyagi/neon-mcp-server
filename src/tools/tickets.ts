import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { findCustomersByName } from "../lib/customers.js";
import {
	dbErrorResponse,
	jsonResponse,
	notFoundResponse,
	textResponse,
} from "../lib/responses.js";
import { supabase } from "../lib/supabase.js";
import { TicketPriority, TicketStatus } from "../lib/validation.js";

export function registerTicketTools(server: McpServer): void {
	// list_tickets tool
	server.tool(
		"list_tickets",
		"List tickets with optional filters by status, priority, customer ID, or customer name",
		{
			status: TicketStatus.optional(),
			customer_id: z
				.string()
				.uuid("Customer ID must be a valid UUID")
				.optional(),
			customer_name: z.string().optional(),
			priority: TicketPriority.optional(),
		},
		async (args) => {
			const { status, customer_id, customer_name, priority } = args;

			let resolvedCustomerIds: string[] | null = null;

			if (customer_name && !customer_id) {
				const result = await findCustomersByName(customer_name);

				if (result.error) {
					return textResponse(
						`Database error while resolving customer name: ${result.error}`,
					);
				}

				if (!result.data || result.data.length === 0) {
					return jsonResponse({
						results: [],
						count: 0,
						message: `No customers match the name "${customer_name}"`,
					});
				}

				resolvedCustomerIds = result.data.map((c) => c.id);
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
			} else if (resolvedCustomerIds) {
				query = query.in("customer_id", resolvedCustomerIds);
			}

			if (priority) {
				query = query.eq("priority", priority);
			}

			const { data, error } = await query;

			if (error) {
				return dbErrorResponse(error);
			}

			const results = (data || []).map((ticket) => ({
				...ticket,
				customer_name: ticket.customers?.name || "Unknown Customer",
				customers: undefined,
			}));

			const response: {
				results: typeof results;
				count: number;
				message?: string;
			} = {
				results,
				count: results.length,
			};

			if (results.length === 0) {
				response.message = "No tickets match your filters";
			}

			return jsonResponse(response);
		},
	);

	// get_ticket tool
	server.tool(
		"get_ticket",
		"Get ticket details including linked customer information",
		{
			id: z.string().uuid("Ticket ID must be a valid UUID"),
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

			if (error || !data) {
				return notFoundResponse("Ticket", id);
			}

			const response = {
				...data,
				customer: data.customers
					? {
							id: data.customers.id,
							name: data.customers.name,
							email: data.customers.email,
							company: data.customers.company,
						}
					: null,
				customers: undefined,
			};

			return jsonResponse(response);
		},
	);

	// create_ticket tool
	server.tool(
		"create_ticket",
		"Create a new support ticket. Provide customer_id or customer_name to link the ticket.",
		{
			customer_id: z.string().uuid().optional(),
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
				finalCustomerId = customer_id;
			} else {
				const result = await findCustomersByName(customer_name as string);

				if (result.error) {
					return textResponse(
						`Database error while resolving customer name: ${result.error}`,
					);
				}

				if (!result.data || result.data.length === 0) {
					return textResponse(`No customer found matching "${customer_name}"`);
				}

				if (result.data.length > 1) {
					return jsonResponse({
						error: `Multiple customers match "${customer_name}". Please specify which one:`,
						matches: result.data.map((c) => ({
							id: c.id,
							name: c.name,
						})),
					});
				}

				finalCustomerId = result.data[0].id;
			}

			// Validate that the customer exists
			const { data: customerCheck, error: customerCheckError } = await supabase
				.from("customers")
				.select("id")
				.eq("id", finalCustomerId)
				.single();

			if (customerCheckError || !customerCheck) {
				return notFoundResponse("Customer", finalCustomerId);
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
				return dbErrorResponse(error);
			}

			return jsonResponse(data[0]);
		},
	);

	// close_ticket tool
	server.tool(
		"close_ticket",
		"Close a support ticket and mark it as resolved with optional resolution note",
		{
			id: z.string().uuid("Ticket ID must be a valid UUID"),
			resolution: z.string().optional(),
		},
		async (args) => {
			const { id, resolution } = args;

			const { data: existing, error: fetchError } = await supabase
				.from("tickets")
				.select("status, closed_at")
				.eq("id", id)
				.single();

			if (fetchError || !existing) {
				return notFoundResponse("Ticket", id);
			}

			if (existing.status === "closed") {
				return textResponse(
					`Ticket ${id} is already closed (closed on ${existing.closed_at})`,
				);
			}

			const { data, error } = await supabase
				.from("tickets")
				.update({
					status: "closed",
					closed_at: new Date().toISOString(),
					resolution: resolution || null,
				})
				.eq("id", id)
				.select();

			if (error) {
				return dbErrorResponse(error);
			}

			return jsonResponse(data[0]);
		},
	);
}
