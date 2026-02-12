import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
	dbErrorResponse,
	jsonResponse,
	listResponse,
	notFoundResponse,
	textResponse,
} from "../lib/responses.js";
import { supabase } from "../lib/supabase.js";
import { CustomerStatus, uuidParam } from "../lib/validation.js";

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
				return dbErrorResponse(error);
			}

			return listResponse(data || [], "No customers match your filters");
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

			const { data: customer, error: customerError } = await supabase
				.from("customers")
				.select("*")
				.eq("id", id)
				.single();

			if (customerError || !customer) {
				return notFoundResponse("Customer", id);
			}

			const { count: totalCount, error: totalError } = await supabase
				.from("tickets")
				.select("id", { count: "exact", head: true })
				.eq("customer_id", id);

			const { count: openCount, error: openError } = await supabase
				.from("tickets")
				.select("id", { count: "exact", head: true })
				.eq("customer_id", id)
				.neq("status", "closed");

			const { data: recentTickets, error: recentError } = await supabase
				.from("tickets")
				.select("subject, status, created_at")
				.eq("customer_id", id)
				.order("created_at", { ascending: false })
				.limit(3);

			if (totalError || openError || recentError) {
				const messages = [
					totalError?.message,
					openError?.message,
					recentError?.message,
				]
					.filter(Boolean)
					.join(", ");
				return textResponse(
					`Database error while fetching ticket data: ${messages}`,
				);
			}

			return jsonResponse({
				...customer,
				open_tickets_count: openCount ?? 0,
				total_tickets_count: totalCount ?? 0,
				recent_tickets: recentTickets || [],
			});
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

			const { data, error } = await supabase
				.from("customers")
				.insert({
					name,
					email,
					company: company || null,
					status: status || "active",
				})
				.select();

			if (error) {
				if (error.code === "23505") {
					return textResponse(
						`A customer with email "${email}" already exists`,
					);
				}
				return dbErrorResponse(error);
			}

			return jsonResponse(data[0]);
		},
	);

	// update_customer tool
	server.tool(
		"update_customer",
		"Update customer fields by ID. Only send the fields you want to change.",
		{
			id: uuidParam("Customer ID"),
			name: z.string().optional(),
			email: z.email({ error: "Invalid email format" }).optional(),
			company: z.string().optional(),
			status: CustomerStatus.optional(),
		},
		async (args) => {
			const { id, name, email, company, status } = args;

			const updates: Record<string, unknown> = {};
			if (name !== undefined) updates.name = name;
			if (email !== undefined) updates.email = email;
			if (company !== undefined) updates.company = company;
			if (status !== undefined) updates.status = status;

			if (Object.keys(updates).length === 0) {
				return textResponse("No fields provided to update");
			}

			const { data, error } = await supabase
				.from("customers")
				.update(updates)
				.eq("id", id)
				.select();

			if (error) {
				if (error.code === "23505") {
					const msg = email
						? `Email "${email}" is already taken by another customer`
						: "A customer with that email already exists";
					return textResponse(msg);
				}
				return dbErrorResponse(error);
			}

			if (!data || data.length === 0) {
				return notFoundResponse("Customer", id);
			}

			return jsonResponse(data[0]);
		},
	);
}
