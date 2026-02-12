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
	const { count } = await query;
	return count ?? 0;
}

export function registerAnalyticsTools(server: McpServer): void {
	// get_summary tool
	server.tool(
		"get_summary",
		"Get a dashboard summary with customer counts, ticket stats, product catalog value, and recent activity",
		{},
		async () => {
			const sevenDaysAgo = new Date(
				Date.now() - 7 * 24 * 60 * 60 * 1000,
			).toISOString();

			try {
				const [active, inactive, leads] = await Promise.all([
					countWhere("customers", [
						{ field: "status", op: "eq", value: "active" },
					]),
					countWhere("customers", [
						{ field: "status", op: "eq", value: "inactive" },
					]),
					countWhere("customers", [
						{ field: "status", op: "eq", value: "lead" },
					]),
				]);

				const openFilter: CountFilter = {
					field: "status",
					op: "neq",
					value: "closed",
				};

				const [open, closed, urgent, high, medium, low] = await Promise.all([
					countWhere("tickets", [openFilter]),
					countWhere("tickets", [
						{ field: "status", op: "eq", value: "closed" },
					]),
					countWhere("tickets", [
						openFilter,
						{
							field: "priority",
							op: "eq",
							value: "urgent",
						},
					]),
					countWhere("tickets", [
						openFilter,
						{ field: "priority", op: "eq", value: "high" },
					]),
					countWhere("tickets", [
						openFilter,
						{
							field: "priority",
							op: "eq",
							value: "medium",
						},
					]),
					countWhere("tickets", [
						openFilter,
						{ field: "priority", op: "eq", value: "low" },
					]),
				]);

				const [
					productsResult,
					customersCreatedThisWeek,
					ticketsClosedThisWeek,
				] = await Promise.all([
					supabase.from("products").select("price_cents, category"),
					countWhere("customers", [
						{
							field: "created_at",
							op: "gte",
							value: sevenDaysAgo,
						},
					]),
					countWhere("tickets", [
						{ field: "status", op: "eq", value: "closed" },
						{
							field: "closed_at",
							op: "gte",
							value: sevenDaysAgo,
						},
					]),
				]);

				let productValue = "Error loading product data";
				let categoryBreakdown: { category: string; value: string }[] = [];

				if (!productsResult.error && productsResult.data) {
					const products = productsResult.data;
					const totalValue = products.reduce(
						(sum, p) => sum + p.price_cents,
						0,
					);

					const categoryTotals: Record<string, number> = {};
					for (const product of products) {
						categoryTotals[product.category] =
							(categoryTotals[product.category] || 0) + product.price_cents;
					}

					productValue = formatPrice(totalValue);
					categoryBreakdown = Object.entries(categoryTotals).map(
						([category, value]) => ({
							category,
							value: formatPrice(value),
						}),
					);
				}

				return jsonResponse({
					customers: {
						active,
						inactive,
						leads,
						total: active + inactive + leads,
					},
					tickets: {
						open,
						closed,
						total: open + closed,
						by_priority: { urgent, high, medium, low },
					},
					products: {
						total_value: productValue,
						by_category: categoryBreakdown,
					},
					recent_activity: {
						customers_created_this_week: customersCreatedThisWeek,
						tickets_closed_this_week: ticketsClosedThisWeek,
					},
				});
			} catch (error) {
				return textResponse(
					`Error fetching summary: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		},
	);
}
