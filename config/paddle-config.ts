import type { PlanTier } from "@/lib/types";

const PRICING_TIER: PlanTier[] = [
	{
		priceId: "pri_01k2q2kvxscyyn0w5wsg32pf3w",
		planId: "FREE_SLICE",
		productTitle: "Trial Slice",
		icon: "/assets/icons/price-tiers/free-icon.svg",
		description: "30 day FREE TRIAL",
		features: ["7 day free trial with full access to all CURATE CONTROL features"],
		featured: false,
		episodeLimit: 50,
	},
	{
		priceId: "pri_01k1dzhm5ccevk59y626z80mmf",
		productTitle: "Casual Listener",
		planId: "CASUAL_LISTENER",
		icon: "/assets/icons/price-tiers/free-icon.svg",
		features: [
			"Custom User-Curated Bundles: Our team selects approximately 25 high-quality podcast shows.",
			"Pre-curated Feeds: For ultimate convenience, we offer three exclusive 'Editor's Choice' Feeds.",
		],
		description: "Enhanced experience with For ultimate convenience",
		episodeLimit: 0,
		featured: false,
	},
	{
		priceId: "pri_01k23mdwkrr8g9cp7bdbp8xqm8",
		productTitle: "Curate Control",
		planId: "CURATE_CONTROL",
		icon: "/assets/icons/price-tiers/free-icon.svg",
		features: [
			"Access to all other features and tools (Casual Listener included)",
			"AI-Powered Audio and Text Summaries: Create single or multi-speaker, realistically AI-synthesized voiced podcast-style summaries. capped at 50",
		],
		description:
			"Stay in control with the ability to create fully personalised Ai powered generated audio summaries",
		episodeLimit: 50,
		featured: true,
	},
];

export { PRICING_TIER };
