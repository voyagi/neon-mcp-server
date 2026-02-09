// Shared MCP tool response helpers — eliminates duplication across tool files

export function jsonResponse(data: unknown) {
	return {
		content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
	};
}

export function textResponse(message: string) {
	return {
		content: [{ type: "text" as const, text: message }],
	};
}

export function dbErrorResponse(error: { message: string }) {
	return textResponse(`Database error: ${error.message}`);
}

export function notFoundResponse(entity: string, id: string) {
	return textResponse(`${entity} not found: ${id}`);
}
