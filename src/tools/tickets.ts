import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
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

			// Customer name resolution (two-step query)
			let resolvedCustomerIds: string[] | null = null;

			// Only resolve customer_name if customer_id is NOT provided
			if (customer_name && !customer_id) {
				const { data: matchingCustomers, error: customerError } = await supabase
					.from("customers")
					.select("id")
					.ilike("name", `%${customer_name}%`);

				if (customerError) {
					return {
						content: [
							{
								type: "text",
								text: `Database error while resolving customer name: ${customerError.message}`,
							},
						],
					};
				}

				if (!matchingCustomers || matchingCustomers.length === 0) {
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(
									{
										results: [],
										count: 0,
										message: `No customers match the name "${customer_name}"`,
									},
									null,
									2,
								),
							},
						],
					};
				}

				resolvedCustomerIds = matchingCustomers.map((c) => c.id);
			}

			// Build main query with conditional filters
			let query = supabase
				.from("tickets")
				.select("*, customers(name)")
				.order("created_at", { ascending: false });

			if (status) {
				query = query.eq("status", status);
			}

			if (customer_id) {
				// customer_id takes precedence
				query = query.eq("customer_id", customer_id);
			} else if (resolvedCustomerIds) {
				// Use resolved customer IDs from name search
				query = query.in("customer_id", resolvedCustomerIds);
			}

			if (priority) {
				query = query.eq("priority", priority);
			}

			const { data, error } = await query;

			if (error) {
				return {
					content: [
						{
							type: "text",
							text: `Database error: ${error.message}`,
						},
					],
				};
			}

			// Flatten customers.name to customer_name
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

			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(response, null, 2),
					},
				],
			};
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
				return {
					content: [
						{
							type: "text",
							text: `Ticket not found: ${id}`,
						},
					],
				};
			}

			// Flatten customers nested object to customer (singular)
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

			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(response, null, 2),
					},
				],
			};
		},
	);
}
