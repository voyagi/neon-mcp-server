import { describe, expect, it } from "vitest";
import { formatPrice, formatProduct } from "../src/lib/formatters.js";

describe("formatPrice", () => {
	it("formats zero cents", () => {
		expect(formatPrice(0)).toBe("$0.00");
	});

	it("formats whole dollars", () => {
		expect(formatPrice(100)).toBe("$1.00");
	});

	it("formats cents correctly", () => {
		expect(formatPrice(4999)).toBe("$49.99");
	});

	it("formats large amounts", () => {
		expect(formatPrice(12345)).toBe("$123.45");
	});
});

describe("formatProduct", () => {
	it("adds price_display to product", () => {
		const product = {
			id: "p1",
			name: "Starter Plan",
			category: "subscription",
			price_cents: 4900,
			description: "Basic plan",
			created_at: "2026-01-01",
		};

		const result = formatProduct(product);

		expect(result.price_display).toBe("$49.00");
		expect(result.id).toBe("p1");
		expect(result.name).toBe("Starter Plan");
		expect(result.price_cents).toBe(4900);
	});

	it("handles null description", () => {
		const product = {
			id: "p2",
			name: "Add-on",
			category: "add-on",
			price_cents: 2900,
			description: null,
			created_at: null,
		};

		const result = formatProduct(product);

		expect(result.price_display).toBe("$29.00");
		expect(result.description).toBeNull();
	});
});
