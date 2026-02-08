import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSchemaResource } from "./resources/schema.js";
import { registerAnalyticsTools } from "./tools/analytics.js";
import { registerCustomerTools } from "./tools/customers.js";
import { registerProductTools } from "./tools/products.js";
import { registerTicketTools } from "./tools/tickets.js";

export function createServer() {
	const server = new McpServer({
		name: "techstart-crm",
		version: "0.1.0",
	});

	// Resources
	registerSchemaResource(server);

	// Tools — Read operations
	registerCustomerTools(server);
	registerTicketTools(server);
	registerProductTools(server);

	// Analytics
	registerAnalyticsTools(server);

	return server;
}
