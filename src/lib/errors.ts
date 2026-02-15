// Named constants for database error codes used across tool handlers

/** PostgREST: query returned zero rows when .single() expects exactly one */
export const PGRST_NOT_FOUND = "PGRST116";

/** PostgreSQL: unique constraint violation (e.g., duplicate email) */
export const PG_UNIQUE_VIOLATION = "23505";
