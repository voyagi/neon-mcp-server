import { describe, expect, it } from "vitest";
import {
	dbErrorResponse,
	jsonResponse,
	notFoundResponse,
	textResponse,
} from "../src/lib/responses.js";

describe("jsonResponse", () => {
	it("wraps data in MCP text content format", () => {
		const data = { name: "Alice", email: "alice@test.com" };
		const result = jsonResponse(data);

		expect(result).toEqual({
			content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
		});
	});

	it("handles arrays", () => {
		const result = jsonResponse([1, 2, 3]);
		expect(JSON.parse(result.content[0].text)).toEqual([1, 2, 3]);
	});
});

describe("textResponse", () => {
	it("wraps message in MCP text content format", () => {
		const result = textResponse("Something happened");
		expect(result).toEqual({
			content: [{ type: "text", text: "Something happened" }],
		});
	});
});

describe("dbErrorResponse", () => {
	it("formats database error with message prefix", () => {
		const result = dbErrorResponse({ message: "connection refused" });
		expect(result.content[0].text).toBe(
			"Database error: connection refused",
		);
	});
});

describe("notFoundResponse", () => {
	it("formats entity not found message", () => {
		const result = notFoundResponse("Customer", "abc-123");
		expect(result.content[0].text).toBe("Customer not found: abc-123");
	});
});
