import { z } from "zod";

// Factory for enum schemas with descriptive error messages
function enumSchema<T extends string>(values: readonly [T, ...T[]]) {
	return z.enum(values, {
		errorMap: (issue, ctx) => {
			if (issue.code === "invalid_enum_value") {
				return {
					message: `'${ctx.data}' is not valid. Expected: ${values.join(", ")}`,
				};
			}
			return { message: ctx.defaultError };
		},
	});
}

export const CustomerStatus = enumSchema(["active", "inactive", "lead"]);
export const TicketStatus = enumSchema(["open", "in_progress", "closed"]);
export const TicketPriority = enumSchema(["low", "medium", "high", "urgent"]);
