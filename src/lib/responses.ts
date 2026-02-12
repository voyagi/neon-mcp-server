// Shared MCP tool response helpers — eliminates duplication across tool files

export type McpToolResponse = {
	content: { type: "text"; text: string }[];
};

export function jsonResponse(data: unknown): McpToolResponse {
	return {
		content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
	};
}

export function textResponse(message: string): McpToolResponse {
	return {
		content: [{ type: "text" as const, text: message }],
	};
}

export function dbErrorResponse(error: { message: string }): McpToolResponse {
	return textResponse(`Database error: ${error.message}`);
}

export function notFoundResponse(entity: string, id: string): McpToolResponse {
	return textResponse(`${entity} not found: ${id}`);
}

export function listResponse<T>(
	results: T[],
	emptyMessage?: string,
): McpToolResponse {
	const response: { results: T[]; count: number; message?: string } = {
		results,
		count: results.length,
	};
	if (results.length === 0 && emptyMessage) {
		response.message = emptyMessage;
	}
	return jsonResponse(response);
}
