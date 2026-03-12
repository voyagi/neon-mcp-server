import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDbMock } from "./helpers/mock-db.js";

vi.mock("../src/lib/db.js", () => createDbMock());

import { sql } from "../src/lib/db.js";
import {
	findCustomersByName,
	resolveCustomerIds,
	resolveOneCustomer,
	validateCustomerExists,
} from "../src/lib/customers.js";

const mockedSql = vi.mocked(sql);

beforeEach(() => {
	vi.clearAllMocks();
});

describe("findCustomersByName", () => {
	it("returns matching customers", async () => {
		mockedSql.mockResolvedValueOnce([{ id: "c1", name: "Alice Chen" }]);

		const result = await findCustomersByName("Alice");
		expect(result.data).toHaveLength(1);
		expect(result.data![0].name).toBe("Alice Chen");
		expect(result.error).toBeNull();
	});

	it("returns empty array when no matches", async () => {
		mockedSql.mockResolvedValueOnce([]);

		const result = await findCustomersByName("Nobody");
		expect(result.data).toHaveLength(0);
		expect(result.error).toBeNull();
	});

	it("returns error on database failure", async () => {
		mockedSql.mockRejectedValueOnce(new Error("connection lost"));

		const result = await findCustomersByName("Alice");
		expect(result.data).toBeNull();
		expect(result.error).toBe("connection lost");
	});
});

describe("resolveCustomerIds", () => {
	it("returns customer IDs for matching names", async () => {
		mockedSql.mockResolvedValueOnce([
			{ id: "c1", name: "Alice Chen" },
			{ id: "c2", name: "Alice Wang" },
		]);

		const result = await resolveCustomerIds("Alice");
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.customerIds).toEqual(["c1", "c2"]);
		}
	});

	it("returns error response when no matches found", async () => {
		mockedSql.mockResolvedValueOnce([]);

		const result = await resolveCustomerIds("Nobody");
		expect(result.ok).toBe(false);
	});

	it("returns error response on database failure", async () => {
		mockedSql.mockRejectedValueOnce(new Error("timeout"));

		const result = await resolveCustomerIds("Alice");
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.response.content[0].text).toContain("Database error");
		}
	});
});

describe("resolveOneCustomer", () => {
	it("returns single customer ID when exactly one match", async () => {
		mockedSql.mockResolvedValueOnce([{ id: "c1", name: "Alice Chen" }]);

		const result = await resolveOneCustomer("Alice");
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.customerId).toBe("c1");
		}
	});

	it("returns error with matches when multiple found", async () => {
		mockedSql.mockResolvedValueOnce([
			{ id: "c1", name: "Alice Chen" },
			{ id: "c2", name: "Alice Wang" },
		]);

		const result = await resolveOneCustomer("Alice");
		expect(result.ok).toBe(false);
		if (!result.ok) {
			const parsed = JSON.parse(result.response.content[0].text);
			expect(parsed.error).toContain("Multiple customers");
			expect(parsed.matches).toHaveLength(2);
		}
	});

	it("returns error when no matches found", async () => {
		mockedSql.mockResolvedValueOnce([]);

		const result = await resolveOneCustomer("Nobody");
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.response.content[0].text).toContain(
				"No customer found",
			);
		}
	});

	it("returns error on database failure", async () => {
		mockedSql.mockRejectedValueOnce(new Error("connection lost"));

		const result = await resolveOneCustomer("Alice");
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.response.content[0].text).toContain("Database error");
		}
	});
});

describe("validateCustomerExists", () => {
	it("returns customer ID when exists", async () => {
		const id = "abc00000-0000-0000-0000-000000000001";
		mockedSql.mockResolvedValueOnce([{ id }]);

		const result = await validateCustomerExists(id);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.customerId).toBe(id);
		}
	});

	it("returns not found when customer missing", async () => {
		const id = "abc00000-0000-0000-0000-000000000999";
		mockedSql.mockResolvedValueOnce([]);

		const result = await validateCustomerExists(id);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.response.content[0].text).toContain("not found");
		}
	});
});
