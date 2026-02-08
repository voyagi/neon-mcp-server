import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";

// Helper function to format product with price display
function formatProduct(product: {
	id: string;
	name: string;
	category: string;
	price_cents: number;
	description: string | null;
	created_at: string | null;
}) {
	return {
		...product,
		price_display: `$${(product.price_cents / 100).toFixed(2)}`,
	};
}

export function registerProductTools(server: McpServer): void {
	// list_products tool
	server.tool(
		"list_products",
		"List all products with pricing information",
		{},
		async () => {
			const { data, error } = await supabase
				.from("products")
				.select("*")
				.order("name", { ascending: true });

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

			const products = (data || []).map(formatProduct);
			const response = {
				results: products,
				count: products.length,
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

	// search_products tool
	server.tool(
		"search_products",
		"Search products by name, category, or description",
		{
			query: z.string().min(1, "Search query is required"),
		},
		async (args) => {
			const { query } = args;

			const { data, error } = await supabase
				.from("products")
				.select("*")
				.or(
					`name.ilike.%${query}%,category.ilike.%${query}%,description.ilike.%${query}%`,
				)
				.order("name", { ascending: true });

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

			const products = (data || []).map(formatProduct);
			const response: {
				results: typeof products;
				count: number;
				message?: string;
			} = {
				results: products,
				count: products.length,
			};

			if (products.length === 0) {
				response.message = `No products match "${query}"`;
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
}
