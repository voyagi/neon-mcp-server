import { createClient } from "@supabase/supabase-js";

// Validate required environment variables at module load
if (!process.env.SUPABASE_URL) {
	throw new Error(
		"Missing required environment variable: SUPABASE_URL. See README.md for configuration instructions.",
	);
}

if (!process.env.SUPABASE_SECRET_KEY) {
	throw new Error(
		"Missing required environment variable: SUPABASE_SECRET_KEY. See README.md for configuration instructions.",
	);
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Validates database connection by running a test query.
 * Throws if connection fails.
 */
export async function validateConnection(): Promise<void> {
	try {
		const { error } = await supabase.from("customers").select("id").limit(1);

		if (error) {
			throw error;
		}

		console.error("Supabase connection verified");
	} catch {
		throw new Error(
			"Failed to connect to Supabase database. Verify SUPABASE_URL and SUPABASE_SECRET_KEY are correct. If tables are missing, run the seed script — see README.md.",
		);
	}
}
