import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { query, sql } from "../lib/db.js";
import { formatPrice } from "../lib/formatters.js";
import { jsonResponse, textResponse } from "../lib/responses.js";

type CountFilter = {
	field: string;
	op: "eq" | "neq" | "gte";
	value: string;
};

async function countWhere(
	table: "customers" | "tickets",
	filters: CountFilter[],
): Promise<number> {
	const conditions: string[] = [];
	const values: unknown[] = [];

	for (const { field, op, value } of filters) {
		const paramNum = values.length + 1;
		if (op === "eq") conditions.push(`${field} = $${paramNum}`);
		else if (op === "neq") conditions.push(`${field} != $${paramNum}`);
		else conditions.push(`${field} >= $${paramNum}`);
		values.push(value);
	}

	const where =
		conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
	// Table name is a typed literal, not user input
	const rows = await query(
		`SELECT COUNT(*)::int AS count FROM ${table} ${where}`,
		values,
	);
	return rows[0].count as number;
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
	try {
		const products = await sql`SELECT price_cents, category FROM products`;
		const totalValue = products.reduce(
			(sum, p) => sum + (p.price_cents as number),
			0,
		);
		return {
			total_value: formatPrice(totalValue),
			by_category: aggregateByCategory(
				products as { price_cents: number; category: string }[],
			),
		};
	} catch (error) {
		console.error("Failed to fetch product stats:", error);
		return { total_value: "Error loading product data", by_category: [] };
	}
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
