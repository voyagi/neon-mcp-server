import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatPrice } from "../lib/formatters.js";
import { jsonResponse, textResponse } from "../lib/responses.js";
import { supabase } from "../lib/supabase.js";

type CountFilter = {
	field: string;
	op: "eq" | "neq" | "gte";
	value: string;
};

async function countWhere(
	table: string,
	filters: CountFilter[],
): Promise<number> {
	let query = supabase.from(table).select("id", { count: "exact", head: true });
	for (const { field, op, value } of filters) {
		if (op === "eq") query = query.eq(field, value);
		else if (op === "neq") query = query.neq(field, value);
		else query = query.gte(field, value);
	}
	const { count, error } = await query;
	if (error) throw error;
	return count ?? 0;
}

/** Aggregates product prices by category into formatted display values */
export function aggregateByCategory(
	products: { price_cents: number; category: string }[],
): { category: string; value: string }[] {
	const totals = products.reduce<Record<string, number>>((acc, product) => {
		acc[product.category] = (acc[product.category] || 0) + product.price_cents;
		return acc;
	}, {});

	return Object.entries(totals).map(([category, cents]) => ({
		category,
		value: formatPrice(cents),
	}));
}

async function fetchCustomerCounts() {
	const [active, inactive, leads] = await Promise.all([
		countWhere("customers", [{ field: "status", op: "eq", value: "active" }]),
		countWhere("customers", [{ field: "status", op: "eq", value: "inactive" }]),
		countWhere("customers", [{ field: "status", op: "eq", value: "lead" }]),
	]);
	return { active, inactive, leads, total: active + inactive + leads };
}

async function fetchTicketCounts() {
	const openFilter: CountFilter = {
		field: "status",
		op: "neq",
		value: "closed",
	};

	const [open, closed, urgent, high, medium, low] = await Promise.all([
		countWhere("tickets", [openFilter]),
		countWhere("tickets", [{ field: "status", op: "eq", value: "closed" }]),
		countWhere("tickets", [
			openFilter,
			{ field: "priority", op: "eq", value: "urgent" },
		]),
		countWhere("tickets", [
			openFilter,
			{ field: "priority", op: "eq", value: "high" },
		]),
		countWhere("tickets", [
			openFilter,
			{ field: "priority", op: "eq", value: "medium" },
		]),
		countWhere("tickets", [
			openFilter,
			{ field: "priority", op: "eq", value: "low" },
		]),
	]);

	return {
		open,
		closed,
		total: open + closed,
		by_priority: { urgent, high, medium, low },
	};
}

async function fetchProductStats() {
	const { data: products, error } = await supabase
		.from("products")
		.select("price_cents, category");

	if (error || !products) {
		return { total_value: "Error loading product data", by_category: [] };
	}

	const totalValue = products.reduce((sum, p) => sum + p.price_cents, 0);
	return {
		total_value: formatPrice(totalValue),
		by_category: aggregateByCategory(products),
	};
}

async function fetchRecentActivity(sevenDaysAgo: string) {
	const [customersCreatedThisWeek, ticketsClosedThisWeek] = await Promise.all([
		countWhere("customers", [
			{ field: "created_at", op: "gte", value: sevenDaysAgo },
		]),
		countWhere("tickets", [
			{ field: "status", op: "eq", value: "closed" },
			{ field: "closed_at", op: "gte", value: sevenDaysAgo },
		]),
	]);

	return {
		customers_created_this_week: customersCreatedThisWeek,
		tickets_closed_this_week: ticketsClosedThisWeek,
	};
}

export function registerAnalyticsTools(server: McpServer): void {
	server.tool(
		"get_summary",
		"Get a dashboard summary with customer counts, ticket stats, product catalog value, and recent activity",
		{},
		async () => {
			const sevenDaysAgo = new Date(
				Date.now() - 7 * 24 * 60 * 60 * 1000,
			).toISOString();

			const results = await Promise.allSettled([
				fetchCustomerCounts(),
				fetchTicketCounts(),
				fetchProductStats(),
				fetchRecentActivity(sevenDaysAgo),
			]);

			const [customers, tickets, products, recentActivity] = results;

			const summary: Record<string, unknown> = {};
			const errors: string[] = [];

			if (customers.status === "fulfilled") summary.customers = customers.value;
			else
				errors.push(
					`customers: ${customers.reason?.message ?? String(customers.reason)}`,
				);

			if (tickets.status === "fulfilled") summary.tickets = tickets.value;
			else
				errors.push(
					`tickets: ${tickets.reason?.message ?? String(tickets.reason)}`,
				);

			if (products.status === "fulfilled") summary.products = products.value;
			else
				errors.push(
					`products: ${products.reason?.message ?? String(products.reason)}`,
				);

			if (recentActivity.status === "fulfilled")
				summary.recent_activity = recentActivity.value;
			else
				errors.push(
					`recent_activity: ${recentActivity.reason?.message ?? String(recentActivity.reason)}`,
				);

			if (Object.keys(summary).length === 0) {
				return textResponse(`Error fetching summary: ${errors.join("; ")}`);
			}

			if (errors.length > 0) summary.errors = errors;
			return jsonResponse(summary);
		},
	);
}
