// Named constants for PostgreSQL error codes used across tool handlers

/** PostgreSQL: unique constraint violation (e.g., duplicate email) */
export const PG_UNIQUE_VIOLATION = "23505";

/** PostgreSQL: foreign key constraint violation (e.g., referencing deleted customer) */
export const PG_FK_VIOLATION = "23503";

/** Type guard: checks if an error has a specific PostgreSQL error code */
export function hasErrorCode(error: unknown, code: string): boolean {
	return (
		error instanceof Error && (error as Error & { code?: string }).code === code
	);
}
