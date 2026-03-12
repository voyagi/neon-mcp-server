import { describe, expect, it } from "vitest";
import { formatPrice, formatProduct } from "../src/lib/formatters.js";

describe("formatPrice", () => {
	it("formats cents as dollar string", () => {
		expect(formatPrice(4900)).toBe("$49.00");
		expect(formatPrice(0)).toBe("$0.00");
		expect(formatPrice(1)).toBe("$0.01");
		expect(formatPrice(49900)).toBe("$499.00");
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
		expect(result.price_cents).toBe(4900);
		expect(result.name).toBe("Starter Plan");
	});

	it("preserves null description", () => {
		const product = {
			id: "p1",
			name: "Test",
			category: "test",
			price_cents: 100,
			description: null,
			created_at: null,
		};

		const result = formatProduct(product);
		expect(result.description).toBeNull();
		expect(result.price_display).toBe("$1.00");
	});
});
