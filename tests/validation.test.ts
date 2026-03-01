import { describe, expect, it } from "vitest";
import {
	CustomerStatus,
	TicketPriority,
	TicketStatus,
	sanitizeFilterValue,
	sanitizeLikeValue,
	uuidParam,
} from "../src/lib/validation.js";

describe("CustomerStatus enum", () => {
	it("accepts valid statuses", () => {
		expect(CustomerStatus.parse("active")).toBe("active");
		expect(CustomerStatus.parse("inactive")).toBe("inactive");
		expect(CustomerStatus.parse("lead")).toBe("lead");
	});

	it("rejects invalid status with descriptive error", () => {
		const result = CustomerStatus.safeParse("deleted");
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toContain("deleted");
			expect(result.error.issues[0].message).toContain("active");
		}
	});
});

describe("TicketStatus enum", () => {
	it("accepts valid statuses", () => {
		expect(TicketStatus.parse("open")).toBe("open");
		expect(TicketStatus.parse("in_progress")).toBe("in_progress");
		expect(TicketStatus.parse("closed")).toBe("closed");
	});

	it("rejects invalid status with descriptive error", () => {
		const result = TicketStatus.safeParse("pending");
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toContain("pending");
			expect(result.error.issues[0].message).toContain("open");
		}
	});
});

describe("TicketPriority enum", () => {
	it("accepts valid priorities", () => {
		expect(TicketPriority.parse("low")).toBe("low");
		expect(TicketPriority.parse("medium")).toBe("medium");
		expect(TicketPriority.parse("high")).toBe("high");
		expect(TicketPriority.parse("urgent")).toBe("urgent");
	});

	it("rejects invalid priority with descriptive error", () => {
		const result = TicketPriority.safeParse("critical");
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toContain("critical");
			expect(result.error.issues[0].message).toContain("low");
		}
	});
});

describe("uuidParam", () => {
	it("accepts a valid UUID", () => {
		const schema = uuidParam("Test ID");
		const result = schema.safeParse("abc00000-0000-0000-0000-000000000001");
		expect(result.success).toBe(true);
	});

	it("rejects non-UUID strings with label in error", () => {
		const schema = uuidParam("Customer ID");
		const result = schema.safeParse("not-a-uuid");
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toContain("Customer ID");
		}
	});
});

describe("sanitizeFilterValue", () => {
	it("passes through normal search terms", () => {
		expect(sanitizeFilterValue("enterprise")).toBe("enterprise");
	});

	it("strips commas to prevent filter injection", () => {
		expect(sanitizeFilterValue("test,id.eq.secret")).toBe("testideqsecret");
	});

	it("strips parentheses", () => {
		expect(sanitizeFilterValue("name(test)")).toBe("nametest");
	});

	it("strips periods to prevent PostgREST operator injection", () => {
		expect(sanitizeFilterValue("id.eq.secret")).toBe("ideqsecret");
	});

	it("handles empty string", () => {
		expect(sanitizeFilterValue("")).toBe("");
	});
});

describe("sanitizeLikeValue", () => {
	it("passes through normal search terms", () => {
		expect(sanitizeLikeValue("alice")).toBe("alice");
	});

	it("escapes percent wildcards", () => {
		expect(sanitizeLikeValue("100%")).toBe("100\\%");
	});

	it("escapes underscore wildcards", () => {
		expect(sanitizeLikeValue("test_name")).toBe("test\\_name");
	});

	it("escapes backslashes", () => {
		expect(sanitizeLikeValue("path\\to")).toBe("path\\\\to");
	});

	it("handles empty string", () => {
		expect(sanitizeLikeValue("")).toBe("");
	});
});
