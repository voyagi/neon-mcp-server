import { createClient } from "@supabase/supabase-js";

// Validate required environment variables at module load
if (!process.env.SUPABASE_URL) {
	console.error(
		"Missing required environment variable: SUPABASE_URL. See README.md for configuration instructions.",
	);
	process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
	console.error(
		"Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY. See README.md for configuration instructions.",
	);
	process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Validates database connection by running a test query.
 * Exits process if connection fails.
 */
export async function validateConnection(): Promise<void> {
	try {
		const { error } = await supabase.from("customers").select("id").limit(1);

		if (error) {
			throw error;
		}

		console.error("Supabase connection verified");
	} catch {
		console.error(
			"Failed to connect to Supabase database. Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are correct. If tables are missing, run the seed script — see README.md.",
		);
		process.exit(1);
	}
}
