import { describe, expect, it } from "vitest";
import {
	CustomerStatus,
	TicketPriority,
	TicketStatus,
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
