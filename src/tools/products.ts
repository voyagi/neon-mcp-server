import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { formatPrice } from "../lib/formatters.js";
import { dbErrorResponse, jsonResponse } from "../lib/responses.js";
import { supabase } from "../lib/supabase.js";

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
		price_display: formatPrice(product.price_cents),
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
				return dbErrorResponse(error);
			}

			const products = (data || []).map(formatProduct);

			return jsonResponse({
				results: products,
				count: products.length,
			});
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
				return dbErrorResponse(error);
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

			return jsonResponse(response);
		},
	);
}
