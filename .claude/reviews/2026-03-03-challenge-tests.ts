import { describe, expect, it } from "vitest";
import { aggregateByCategory } from "../../src/tools/analytics.js";
import {
	formatPrice,
	formatTicketListItem,
	formatTicketWithCustomer,
} from "../../src/lib/formatters.js";
import {
	sanitizeFilterValue,
	sanitizeLikeValue,
} from "../../src/lib/validation.js";

// === Challenge-generated adversarial tests ===

describe("sanitizeFilterValue adversarial inputs", () => {
	it("should strip dots to prevent operator injection", () => {
		const result = sanitizeFilterValue("name.ilike.%admin%");
		expect(result).not.toContain(".");
	});

	it("does NOT strip % wildcards (BUG: wrong sanitizer for LIKE context)", () => {
		// This test documents the existing bug: sanitizeFilterValue
		// does not escape LIKE wildcards, so % passes through.
		const result = sanitizeFilterValue("%");
		expect(result).toBe("%"); // BUG: should be escaped for ILIKE context
	});

	it("does NOT strip _ wildcards (BUG: wrong sanitizer for LIKE context)", () => {
		const result = sanitizeFilterValue("_");
		expect(result).toBe("_"); // BUG: should be escaped for ILIKE context
	});

	it("strips commas that would inject additional filter expressions", () => {
		const result = sanitizeFilterValue("foo,bar.eq.true");
		expect(result).not.toContain(",");
	});

	it("strips parentheses that would group filter expressions", () => {
		const result = sanitizeFilterValue("(name.eq.admin)");
		expect(result).not.toContain("(");
		expect(result).not.toContain(")");
	});

	it("handles empty string input", () => {
		expect(sanitizeFilterValue("")).toBe("");
	});

	it("handles string with only special chars", () => {
		expect(sanitizeFilterValue(".,()")).toBe("");
	});
});

describe("sanitizeLikeValue adversarial inputs", () => {
	it("escapes % wildcard", () => {
		expect(sanitizeLikeValue("50% off")).toBe("50\\% off");
	});

	it("escapes _ single-char wildcard", () => {
		expect(sanitizeLikeValue("test_value")).toBe("test\\_value");
	});

	it("escapes backslash", () => {
		expect(sanitizeLikeValue("path\\to")).toBe("path\\\\to");
	});

	it("handles multiple special chars together", () => {
		expect(sanitizeLikeValue("%_\\")).toBe("\\%\\_\\\\");
	});

	it("handles empty string", () => {
		expect(sanitizeLikeValue("")).toBe("");
	});

	it("leaves normal text unchanged", () => {
		expect(sanitizeLikeValue("hello world")).toBe("hello world");
	});
});

describe("formatPrice edge cases", () => {
	it("formats zero cents", () => {
		expect(formatPrice(0)).toBe("$0.00");
	});

	it("formats single cent", () => {
		expect(formatPrice(1)).toBe("$0.01");
	});

	it("formats negative cents (refund)", () => {
		expect(formatPrice(-500)).toBe("$-5.00");
	});

	it("formats large values correctly", () => {
		expect(formatPrice(10000000)).toBe("$100000.00");
	});

	it("formats maximum safe integer range", () => {
		// 2^53 - 1 is Number.MAX_SAFE_INTEGER = 9007199254740991
		// Division by 100 should still be representable
		const result = formatPrice(9007199254740991);
		expect(result).toBe("$90071992547409.91");
	});

	it("handles NaN input (defensive)", () => {
		// NaN / 100 = NaN, toFixed(2) = "NaN"
		expect(formatPrice(Number.NaN)).toBe("$NaN");
	});

	it("handles Infinity input (defensive)", () => {
		expect(formatPrice(Number.POSITIVE_INFINITY)).toBe("$Infinity");
	});
});

describe("formatTicketListItem edge cases", () => {
	it("handles null customers join", () => {
		const result = formatTicketListItem({
			id: "t1",
			subject: "Test",
			customers: null,
		});
		expect(result.customer_name).toBe("Unknown Customer");
	});

	it("handles missing customers key entirely", () => {
		const result = formatTicketListItem({
			id: "t1",
			subject: "Test",
		});
		expect(result.customer_name).toBe("Unknown Customer");
	});

	it("removes the customers join key from output", () => {
		const result = formatTicketListItem({
			id: "t1",
			customers: { name: "Alice" },
		});
		expect(result).not.toHaveProperty("customers");
		expect(result.customer_name).toBe("Alice");
	});
});

describe("formatTicketWithCustomer edge cases", () => {
	it("handles null customers (orphaned ticket)", () => {
		const result = formatTicketWithCustomer({
			id: "t1",
			subject: "Test",
			customers: null,
		});
		expect(result.customer).toBeNull();
		expect(result).not.toHaveProperty("customers");
	});

	it("reshapes customers join into customer object", () => {
		const result = formatTicketWithCustomer({
			id: "t1",
			customers: {
				id: "c1",
				name: "Alice",
				email: "alice@test.com",
				company: null,
			},
		});
		expect(result.customer).toEqual({
			id: "c1",
			name: "Alice",
			email: "alice@test.com",
			company: null,
		});
	});
});

describe("aggregateByCategory edge cases", () => {
	it("handles empty array", () => {
		expect(aggregateByCategory([])).toEqual([]);
	});

	it("handles single product", () => {
		const result = aggregateByCategory([
			{ price_cents: 1000, category: "tools" },
		]);
		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({ category: "tools", value: "$10.00" });
	});

	it("accumulates correctly across many items", () => {
		const products = Array.from({ length: 100 }, (_, i) => ({
			price_cents: 100,
			category: i % 2 === 0 ? "even" : "odd",
		}));
		const result = aggregateByCategory(products);
		expect(result).toHaveLength(2);
		const even = result.find((r) => r.category === "even");
		const odd = result.find((r) => r.category === "odd");
		expect(even?.value).toBe("$50.00");
		expect(odd?.value).toBe("$50.00");
	});

	it("handles zero-price products", () => {
		const result = aggregateByCategory([
			{ price_cents: 0, category: "free" },
			{ price_cents: 0, category: "free" },
		]);
		expect(result[0].value).toBe("$0.00");
	});
});
