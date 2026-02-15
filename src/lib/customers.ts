import {
	jsonResponse,
	listResponse,
	type McpToolResponse,
	notFoundResponse,
	textResponse,
} from "./responses.js";
import { supabase } from "./supabase.js";
import { sanitizeLikeValue } from "./validation.js";

// Shared customer name resolution — used by ticket tools
export async function findCustomersByName(name: string): Promise<{
	data: { id: string; name: string }[] | null;
	error: string | null;
}> {
	const { data, error } = await supabase
		.from("customers")
		.select("id, name")
		.ilike("name", `%${sanitizeLikeValue(name)}%`);

	if (error) {
		return { data: null, error: error.message };
	}

	return { data: data || [], error: null };
}

type ResolveOk<T> = { ok: true } & T;
type ResolveFail = { ok: false; response: McpToolResponse };

// For list_tickets — resolves name to all matching customer IDs
export async function resolveCustomerIds(
	name: string,
): Promise<ResolveOk<{ customerIds: string[] }> | ResolveFail> {
	const result = await findCustomersByName(name);

	if (result.error) {
		return {
			ok: false,
			response: textResponse(
				`Database error while resolving customer name: ${result.error}`,
			),
		};
	}

	if (!result.data || result.data.length === 0) {
		return {
			ok: false,
			response: listResponse([], `No customers match the name "${name}"`),
		};
	}

	return { ok: true, customerIds: result.data.map((c) => c.id) };
}

// For create_ticket — resolves name to exactly one customer ID
export async function resolveOneCustomer(
	name: string,
): Promise<ResolveOk<{ customerId: string }> | ResolveFail> {
	const result = await findCustomersByName(name);

	if (result.error) {
		return {
			ok: false,
			response: textResponse(
				`Database error while resolving customer name: ${result.error}`,
			),
		};
	}

	if (!result.data || result.data.length === 0) {
		return {
			ok: false,
			response: textResponse(`No customer found matching "${name}"`),
		};
	}

	if (result.data.length > 1) {
		return {
			ok: false,
			response: jsonResponse({
				error: `Multiple customers match "${name}". Please specify which one:`,
				matches: result.data.map((c) => ({ id: c.id, name: c.name })),
			}),
		};
	}

	return { ok: true, customerId: result.data[0].id };
}

// For create_ticket — validates that a customer ID exists in the database
export async function validateCustomerExists(
	id: string,
): Promise<ResolveOk<{ customerId: string }> | ResolveFail> {
	const { data, error } = await supabase
		.from("customers")
		.select("id")
		.eq("id", id)
		.single();

	if (error || !data) {
		return { ok: false, response: notFoundResponse("Customer", id) };
	}

	return { ok: true, customerId: data.id };
}
