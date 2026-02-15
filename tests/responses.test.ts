import { describe, expect, it } from "vitest";
import {
	dbErrorResponse,
	jsonResponse,
	listResponse,
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

describe("listResponse", () => {
	it("wraps results with count", () => {
		const result = listResponse([{ id: 1 }, { id: 2 }]);
		const parsed = JSON.parse(result.content[0].text);
		expect(parsed.count).toBe(2);
		expect(parsed.results).toHaveLength(2);
	});

	it("includes message when results are empty and emptyMessage provided", () => {
		const result = listResponse([], "No items found");
		const parsed = JSON.parse(result.content[0].text);
		expect(parsed.count).toBe(0);
		expect(parsed.message).toBe("No items found");
	});

	it("omits message when results are empty but no emptyMessage", () => {
		const result = listResponse([]);
		const parsed = JSON.parse(result.content[0].text);
		expect(parsed.count).toBe(0);
		expect(parsed.message).toBeUndefined();
	});

	it("omits message when results are non-empty even with emptyMessage", () => {
		const result = listResponse([{ id: 1 }], "No items found");
		const parsed = JSON.parse(result.content[0].text);
		expect(parsed.count).toBe(1);
		expect(parsed.message).toBeUndefined();
	});
});
