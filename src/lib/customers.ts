import { supabase } from "./supabase.js";

// Shared customer name resolution — used by ticket tools
export async function findCustomersByName(name: string): Promise<{
	data: { id: string; name: string }[] | null;
	error: string | null;
}> {
	const { data, error } = await supabase
		.from("customers")
		.select("id, name")
		.ilike("name", `%${name}%`);

	if (error) {
		return { data: null, error: error.message };
	}

	return { data: data || [], error: null };
}
