import { z } from "zod";

// Factory for enum schemas with descriptive error messages
function enumSchema<T extends string>(values: readonly [T, ...T[]]) {
	return z.enum(values, {
		error: (issue) => {
			if (issue.code === "invalid_value") {
				return `'${issue.input}' is not valid. Expected: ${values.join(", ")}`;
			}
			return undefined;
		},
	});
}

export const CUSTOMER_STATUSES = ["active", "inactive", "lead"] as const;
export const TICKET_STATUSES = ["open", "in_progress", "closed"] as const;
export const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export const CustomerStatus = enumSchema(CUSTOMER_STATUSES);
export const TicketStatus = enumSchema(TICKET_STATUSES);
export const TicketPriority = enumSchema(TICKET_PRIORITIES);

export function uuidParam(label: string) {
	return z.guid({ error: `${label} must be a valid UUID` });
}

// Strip characters that are structural in PostgREST filter syntax
// to prevent filter injection when interpolating into .or() strings
export function sanitizeFilterValue(value: string): string {
	return value.replace(/[,()]/g, "");
}

// Escape LIKE/ILIKE wildcards so user input is matched literally
export function sanitizeLikeValue(value: string): string {
	return value.replace(/[%_\\]/g, "\\$&");
}
