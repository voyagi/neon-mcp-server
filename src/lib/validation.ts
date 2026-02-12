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

export const CustomerStatus = enumSchema(["active", "inactive", "lead"]);
export const TicketStatus = enumSchema(["open", "in_progress", "closed"]);
export const TicketPriority = enumSchema(["low", "medium", "high", "urgent"]);

export function uuidParam(label: string) {
	return z.guid({ error: `${label} must be a valid UUID` });
}
