import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { formatProduct } from "../lib/formatters.js";
import { dbErrorResponse, listResponse } from "../lib/responses.js";
import { supabase } from "../lib/supabase.js";
import { sanitizeFilterValue } from "../lib/validation.js";

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

			return listResponse((data || []).map(formatProduct));
		},
	);

	// search_products tool
	server.tool(
		"search_products",
		"Search products by name, category, or description",
		{
			query: z.string().min(1, { error: "Search query is required" }),
		},
		async (args) => {
			const safe = sanitizeFilterValue(args.query);

			const { data, error } = await supabase
				.from("products")
				.select("*")
				.or(
					`name.ilike.%${safe}%,category.ilike.%${safe}%,description.ilike.%${safe}%`,
				)
				.order("name", { ascending: true });

			if (error) {
				return dbErrorResponse(error);
			}

			return listResponse(
				(data || []).map(formatProduct),
				`No products match "${args.query}"`,
			);
		},
	);
}
