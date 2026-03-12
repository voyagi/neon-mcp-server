import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
	throw new Error(
		"Missing required environment variable: DATABASE_URL. See README.md for configuration instructions.",
	);
}

export const sql = neon(process.env.DATABASE_URL);

/**
 * Execute a dynamic SQL query where the SQL structure varies at runtime.
 * Use `sql` tagged templates for static queries, `query()` for dynamic ones.
 */
export async function query(
	text: string,
	params: unknown[] = [],
): Promise<Record<string, unknown>[]> {
	return sql.query(text, params) as Promise<Record<string, unknown>[]>;
}

/**
 * Validates database connection by running a test query.
 * Throws if connection fails.
 */
export async function validateConnection(): Promise<void> {
	try {
		await sql`SELECT 1`;
		console.error("Database connection verified");
	} catch {
		throw new Error(
			"Failed to connect to database. Verify DATABASE_URL is correct. If tables are missing, run the seed script — see README.md.",
		);
	}
}
