const DEFAULT_GATEWAY = "https://ai-gateway.vercel.sh/v1";

export async function callAIGateway(path: string, body: unknown): Promise<unknown> {
	const key = process.env.AI_GATEWAY_API_KEY;
	if (!key) throw new Error("AI Gateway API key missing");

	const base = process.env.AI_GATEWAY_BASE_URL || DEFAULT_GATEWAY;
	const url = base.replace(/\/$/, "") + path;

	const res = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${key}`,
		},
		body: JSON.stringify(body),
	});

	if (!res.ok) {
		const txt = await res.text();
		throw new Error(`AI Gateway error ${res.status}: ${txt}`);
	}

	return res.json();
}
