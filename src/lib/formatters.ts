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
