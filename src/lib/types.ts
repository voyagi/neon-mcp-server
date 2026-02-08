export interface Customer {
	id: string;
	name: string;
	email: string;
	company: string | null;
	status: "active" | "inactive" | "lead";
	created_at: string;
}

export interface Product {
	id: string;
	name: string;
	category: string;
	price_cents: number;
	description: string | null;
	created_at: string;
}

export interface Ticket {
	id: string;
	customer_id: string;
	subject: string;
	description: string | null;
	status: "open" | "in_progress" | "closed";
	priority: "low" | "medium" | "high" | "urgent";
	created_at: string;
	closed_at: string | null;
	resolution: string | null;
}
