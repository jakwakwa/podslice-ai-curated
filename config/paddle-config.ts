import type { PlanTier } from "@/lib/types";

const PRICING_TIER: PlanTier[] = [
	{
		priceId: "pri_01k2q2kvxscyyn0w5wsg32pf3w",
		planId: "FREE_SLICE",
		productTitle: "Free Slice",
		icon: "/assets/icons/price-tiers/free-icon.svg",
		description: "Limited Pre-curated Bundles to get started",
		features: [
			"Limited  Selection of Pre-curated Bundles",
			"Free users can only choose from the free slice collection of bundles made available by our team.",
			"7 day free trial with full access to all features",
		],
		featured: false,
		episodeLimit: 3,
	},
	{
		priceId: "pri_01k1dzhm5ccevk59y626z80mmf",
		productTitle: "Casual Listener",
		planId: "CASUAL_LISTENER",
		icon: "/assets/icons/price-tiers/free-icon.svg",
		features: [
			"Custom User-Curated Bundles: Our team selects approximately 25 high-quality podcast shows. You have the flexibility to choose up to five individual shows from this curated list to create your custom collection.",
			"Pre-curated Bundles: For ultimate convenience, we offer three exclusive 'Editor's Choice' bundles. Each bundle is a carefully curated package of five shows centered around a specific theme, refreshed monthly by our team to ensure the content remains relevant and engaging.",
		],
		description: "Enhanced experience with For ultimate convenience, we offer three exclusive 'Editor's Choice' bundles and an option to customise yourbundle feed podcast selections",
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
			"AI-Powered Audio and Text Summaries: Users can add any podcast episode URL to generate 4-5 minute long, single or multi-speaker, realistically AI-synthesized voiced podcast-style summaries. These come with text-based key takeaways to complement the audio version, capped at 20 episodes per 30-day membership cycle.",
			"Custom User-Curated Bundles: With this plan you have the flexibility to choose from our curated list of 25 high-quality podcast shows and we will automatically generate a personalised bundle feed for you every week",
			"Create your own Ai powered generated audio summaries from any podcast show or news on the web",
		],
		description: "Stay in control with the ability to create custom bundled feeds and fully personalised Ai powered generated audio summaries",
		episodeLimit: 30,
		featured: false,
	},
];

export { PRICING_TIER };
