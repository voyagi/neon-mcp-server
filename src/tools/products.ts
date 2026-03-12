import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sql } from "../lib/db.js";
import { formatProduct } from "../lib/formatters.js";
import { dbErrorResponse, listResponse } from "../lib/responses.js";
import { sanitizeLikeValue } from "../lib/validation.js";

export function registerProductTools(server: McpServer): void {
	// list_products tool
	server.tool(
		"list_products",
		"List all products with pricing information",
		{},
		async () => {
			try {
				const rows = await sql`SELECT * FROM products ORDER BY name`;
				return listResponse(
					rows.map((row) =>
						formatProduct(row as Parameters<typeof formatProduct>[0]),
					),
				);
			} catch (error) {
				return dbErrorResponse(error);
			}
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
			const pattern = `%${sanitizeLikeValue(args.query)}%`;

			try {
				const rows = await sql`
					SELECT * FROM products
					WHERE name ILIKE ${pattern}
						OR category ILIKE ${pattern}
						OR description ILIKE ${pattern}
					ORDER BY name`;

				return listResponse(
					rows.map((row) =>
						formatProduct(row as Parameters<typeof formatProduct>[0]),
					),
					`No products match "${args.query}"`,
				);
			} catch (error) {
				return dbErrorResponse(error);
			}
		},
	);
}
