const isSandboxEnv = (process.env.NEXT_PUBLIC_PADDLE_ENV || process.env.PADDLE_ENV || "").toLowerCase() === "sandbox" || (process.env.PADDLE_API_KEY || "").includes("sdbx");
const PADDLE_API_URL = isSandboxEnv ? "https://sandbox-api.paddle.com" : "https://api.paddle.com";

interface PaddleApiOptions {
	method: string;
	path: string;
	body?: object;
}

export async function paddleApiRequest({ method, path, body }: PaddleApiOptions) {
	const headers = {
		Authorization: `Bearer ${process.env.PADDLE_API_KEY}`,
		"Content-Type": "application/json",
	};

	const response = await fetch(`${PADDLE_API_URL}${path}`, {
		method,
		headers,
		body: body ? JSON.stringify(body) : undefined,
	});

	if (!response.ok) {
		let details = "";
		try {
			const text = await response.text();
			details = text;
		} catch {}
		throw new Error(`Paddle API error: ${response.status} ${response.statusText}${details ? ` - ${details}` : ""}`);
	}

	return response.json();
}

export async function getSubscription(subscriptionId: string) {
	return paddleApiRequest({
		method: "GET",
		path: `/subscriptions/${subscriptionId}`,
	});
}

export async function getPortalSession(subscriptionId: string) {
	return getSubscription(subscriptionId);
}

export async function cancelSubscription(subscriptionId: string) {
	return paddleApiRequest({
		method: "PATCH",
		path: `/subscriptions/${subscriptionId}`,
		body: {
			status: "canceled",
		},
	});
}

// Schedule cancellation at end of current billing period
export async function scheduleCancelSubscription(subscriptionId: string) {
	return paddleApiRequest({
		method: "POST",
		path: `/subscriptions/${subscriptionId}/cancel`,
		body: {},
	});
}

export async function updateSubscription(subscriptionId: string, updateData: { items: Array<{ price_id: string; quantity: number }>; proration_billing_mode?: "immediate" | "next_billing_period" }) {
	return paddleApiRequest({
		method: "PATCH",
		path: `/subscriptions/${subscriptionId}`,
		body: updateData,
	});
}

export async function getTransaction(transactionId: string) {
	// Only allow alphanumeric, dash, and underscore in transactionId
	if (!/^[a-zA-Z0-9_-]+$/.test(transactionId)) {
		throw new Error("Invalid transactionId format");
	}
	return paddleApiRequest({
		method: "GET",
		path: `/transactions/${transactionId}`,
	});
}

export async function getSubscriptionsByCustomer(customerId: string) {
	// Paddle Billing API lists subscriptions via query param, not nested path
	return paddleApiRequest({
		method: "GET",
		path: `/subscriptions?customer_id=${encodeURIComponent(customerId)}`,
	});
}

export async function createCustomerPortalSession(customerId: string, subscriptionIds?: string[]) {
	const body: Record<string, unknown> = {};
	if (subscriptionIds && subscriptionIds.length > 0) {
		body.subscription_ids = subscriptionIds;
	}
	return paddleApiRequest({
		method: "POST",
		path: `/customers/${customerId}/portal-sessions`,
		body,
	});
}
