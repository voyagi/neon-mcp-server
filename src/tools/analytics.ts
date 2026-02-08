import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { supabase } from "../lib/supabase.js";

// Helper function to format price
function formatPrice(cents: number): string {
	return `$${(cents / 100).toFixed(2)}`;
}

export function registerAnalyticsTools(server: McpServer): void {
	// get_summary tool
	server.tool(
		"get_summary",
		"Get a dashboard summary with customer counts, ticket stats, product catalog value, and recent activity",
		{},
		async () => {
			// Calculate 7 days ago
			const sevenDaysAgo = new Date(
				Date.now() - 7 * 24 * 60 * 60 * 1000,
			).toISOString();

			try {
				// Batch 1 - Customer counts by status
				const [activeCustomers, inactiveCustomers, leadCustomers] =
					await Promise.all([
						supabase
							.from("customers")
							.select("id", { count: "exact", head: true })
							.eq("status", "active"),
						supabase
							.from("customers")
							.select("id", { count: "exact", head: true })
							.eq("status", "inactive"),
						supabase
							.from("customers")
							.select("id", { count: "exact", head: true })
							.eq("status", "lead"),
					]);

				// Batch 2 - Ticket counts
				const [
					openTickets,
					closedTickets,
					urgentTickets,
					highTickets,
					mediumTickets,
					lowTickets,
				] = await Promise.all([
					supabase
						.from("tickets")
						.select("id", { count: "exact", head: true })
						.neq("status", "closed"),
					supabase
						.from("tickets")
						.select("id", { count: "exact", head: true })
						.eq("status", "closed"),
					supabase
						.from("tickets")
						.select("id", { count: "exact", head: true })
						.neq("status", "closed")
						.eq("priority", "urgent"),
					supabase
						.from("tickets")
						.select("id", { count: "exact", head: true })
						.neq("status", "closed")
						.eq("priority", "high"),
					supabase
						.from("tickets")
						.select("id", { count: "exact", head: true })
						.neq("status", "closed")
						.eq("priority", "medium"),
					supabase
						.from("tickets")
						.select("id", { count: "exact", head: true })
						.neq("status", "closed")
						.eq("priority", "low"),
				]);

				// Batch 3 - Products + Recent activity
				const [productsResult, recentCustomers, recentClosedTickets] =
					await Promise.all([
						supabase.from("products").select("price_cents, category"),
						supabase
							.from("customers")
							.select("id", { count: "exact", head: true })
							.gte("created_at", sevenDaysAgo),
						supabase
							.from("tickets")
							.select("id", { count: "exact", head: true })
							.eq("status", "closed")
							.gte("closed_at", sevenDaysAgo),
					]);

				// Extract counts
				const active = activeCustomers.count ?? 0;
				const inactive = inactiveCustomers.count ?? 0;
				const leads = leadCustomers.count ?? 0;

				const open = openTickets.count ?? 0;
				const closed = closedTickets.count ?? 0;

				const urgent = urgentTickets.count ?? 0;
				const high = highTickets.count ?? 0;
				const medium = mediumTickets.count ?? 0;
				const low = lowTickets.count ?? 0;

				const customersCreatedThisWeek = recentCustomers.count ?? 0;
				const ticketsClosedThisWeek = recentClosedTickets.count ?? 0;

				// Product aggregation
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

				const response = {
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
						by_priority: {
							urgent,
							high,
							medium,
							low,
						},
					},
					products: {
						total_value: productValue,
						by_category: categoryBreakdown,
					},
					recent_activity: {
						customers_created_this_week: customersCreatedThisWeek,
						tickets_closed_this_week: ticketsClosedThisWeek,
					},
				};

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(response, null, 2),
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: `Error fetching summary: ${error instanceof Error ? error.message : String(error)}`,
						},
					],
				};
			}
		},
	);
}
