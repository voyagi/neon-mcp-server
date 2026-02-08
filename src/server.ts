import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSchemaResource } from "./resources/schema.js";

export function createServer() {
	const server = new McpServer({
		name: "techstart-crm",
		version: "0.1.0",
	});

	// Resources
	registerSchemaResource(server);

	// Tools will be registered in Phase 2 (read) and Phase 3 (write)

	return server;
}
