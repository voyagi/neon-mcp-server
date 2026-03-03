export function formatPrice(cents: number): string {
	return `$${(cents / 100).toFixed(2)}`;
}

export function formatProduct(product: {
	id: string;
	name: string;
	category: string;
	price_cents: number;
	description: string | null;
	created_at: string | null;
}) {
	return {
		...product,
		price_display: formatPrice(product.price_cents),
	};
}

/** Reshapes a ticket's Supabase join result, replacing `customers` with a flat `customer_name` field */
export function formatTicketListItem(ticket: {
	customers?: { name: string } | null;
	[key: string]: unknown;
}) {
	const { customers, ...rest } = ticket;
	return {
		...rest,
		customer_name: customers?.name ?? "Unknown Customer",
	};
}

/** Reshapes a ticket's Supabase join result, replacing the `customers` join key with a `customer` object */
export function formatTicketWithCustomer(ticket: {
	customers: {
		id: string;
		name: string;
		email: string;
		company: string | null;
	} | null;
	[key: string]: unknown;
}) {
	const { customers, ...rest } = ticket;
	return {
		...rest,
		customer: customers
			? {
					id: customers.id,
					name: customers.name,
					email: customers.email,
					company: customers.company,
				}
			: null,
	};
}
