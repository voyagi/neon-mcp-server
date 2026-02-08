import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function createServer() {
	const server = new McpServer({
		name: "techstart-crm",
		version: "0.1.0",
	});

	// Tools and resources will be registered here during development.
	// See CLAUDE.md for the full list of tools to implement:
	// - customers: list, get, create, update
	// - tickets: list, get, create, close
	// - products: list, search
	// - analytics: get_summary
	// - resources: schema://tables

	return server;
}
