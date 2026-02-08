import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import { CustomerStatus } from "../lib/validation.js";

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

			// Build query with conditional filters
			let query = supabase
				.from("customers")
				.select("*")
				.order("name", { ascending: true });

			if (status) {
				query = query.eq("status", status);
			}

			if (company) {
				query = query.ilike("company", `%${company}%`);
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

			const results = data || [];
			const response: {
				results: typeof results;
				count: number;
				message?: string;
			} = {
				results,
				count: results.length,
			};

			if (results.length === 0) {
				response.message = "No customers match your filters";
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

	// get_customer tool
	server.tool(
		"get_customer",
		"Get a single customer by ID, including their ticket summary",
		{
			id: z.string().uuid("Customer ID must be a valid UUID"),
		},
		async (args) => {
			const { id } = args;

			// Query 1: Get customer
			const { data: customer, error: customerError } = await supabase
				.from("customers")
				.select("*")
				.eq("id", id)
				.single();

			if (customerError || !customer) {
				return {
					content: [
						{
							type: "text",
							text: `Customer not found: ${id}`,
						},
					],
				};
			}

			// Query 2: Get total ticket count
			const { count: totalCount, error: totalError } = await supabase
				.from("tickets")
				.select("id", { count: "exact", head: true })
				.eq("customer_id", id);

			// Query 3: Get open ticket count
			const { count: openCount, error: openError } = await supabase
				.from("tickets")
				.select("id", { count: "exact", head: true })
				.eq("customer_id", id)
				.neq("status", "closed");

			// Query 4: Get recent tickets
			const { data: recentTickets, error: recentError } = await supabase
				.from("tickets")
				.select("subject, status, created_at")
				.eq("customer_id", id)
				.order("created_at", { ascending: false })
				.limit(3);

			// Handle any query errors
			if (totalError || openError || recentError) {
				const errorMsg =
					totalError?.message || openError?.message || recentError?.message;
				return {
					content: [
						{
							type: "text",
							text: `Database error while fetching ticket data: ${errorMsg}`,
						},
					],
				};
			}

			const response = {
				...customer,
				open_tickets_count: openCount ?? 0,
				total_tickets_count: totalCount ?? 0,
				recent_tickets: recentTickets || [],
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
