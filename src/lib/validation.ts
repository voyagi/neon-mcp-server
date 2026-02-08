import { z } from "zod";

// Shared enum schemas with custom error messages

export const CustomerStatus = z.enum(["active", "inactive", "lead"], {
	errorMap: (issue, ctx) => {
		if (issue.code === "invalid_enum_value") {
			return {
				message: `'${ctx.data}' is not valid. Expected: active, inactive, lead`,
			};
		}
		return { message: ctx.defaultError };
	},
});

export const TicketStatus = z.enum(["open", "in_progress", "closed"], {
	errorMap: (issue, ctx) => {
		if (issue.code === "invalid_enum_value") {
			return {
				message: `'${ctx.data}' is not valid. Expected: open, in_progress, closed`,
			};
		}
		return { message: ctx.defaultError };
	},
});

export const TicketPriority = z.enum(["low", "medium", "high", "urgent"], {
	errorMap: (issue, ctx) => {
		if (issue.code === "invalid_enum_value") {
			return {
				message: `'${ctx.data}' is not valid. Expected: low, medium, high, urgent`,
			};
		}
		return { message: ctx.defaultError };
	},
});

// Customer tool schemas

export const ListCustomersSchema = z.object({
	status: CustomerStatus.optional(),
	company: z.string().optional(),
});

export const GetCustomerSchema = z.object({
	id: z.string().uuid("Customer ID must be a valid UUID"),
});

export const CreateCustomerSchema = z
	.object({
		name: z.string().min(1, "Customer name is required"),
		email: z.string().email("Invalid email format"),
		company: z.string().optional(),
		status: CustomerStatus.optional(),
	})
	.strict();

export const UpdateCustomerSchema = z
	.object({
		id: z.string().uuid("Customer ID must be a valid UUID"),
		name: z.string().optional(),
		email: z.string().email("Invalid email format").optional(),
		company: z.string().optional(),
		status: CustomerStatus.optional(),
	})
	.strict();

// Ticket tool schemas

export const ListTicketsSchema = z.object({
	status: TicketStatus.optional(),
	customer_id: z.string().uuid("Customer ID must be a valid UUID").optional(),
	customer_name: z.string().optional(),
	priority: TicketPriority.optional(),
});

export const GetTicketSchema = z.object({
	id: z.string().uuid("Ticket ID must be a valid UUID"),
});

export const CreateTicketSchema = z
	.object({
		customer_id: z.string().uuid("Customer ID must be a valid UUID").optional(),
		customer_name: z.string().optional(),
		subject: z.string().min(1, "Ticket subject is required"),
		description: z.string().optional(),
		priority: TicketPriority.optional(),
	})
	.strict();

export const CloseTicketSchema = z.object({
	id: z.string().uuid("Ticket ID must be a valid UUID"),
	resolution: z.string().optional(),
});

// Product tool schemas

export const ListProductsSchema = z.object({});

export const SearchProductsSchema = z.object({
	query: z.string().min(1, "Search query is required"),
});

// Analytics tool schemas

export const GetSummarySchema = z.object({});

// Validation error formatter

export function formatValidationError(error: z.ZodError): string {
	return error.errors
		.map((err) => {
			const path = err.path.length > 0 ? `${err.path.join(".")}: ` : "";
			return `${path}${err.message}`;
		})
		.join("; ");
}
