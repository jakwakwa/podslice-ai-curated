import type { PlanTier } from "@/lib/types";

const PRICING_TIER: PlanTier[] = [
	{
		priceId: "pri_01k2q2kvxscyyn0w5wsg32pf3w",
		planId: "FREE_SLICE",
		productTitle: "Free Slice (30 day trial)",
		icon: "/assets/icons/price-tiers/free-icon.svg",
		description: "Starting out",
		features: ["Access to free bundled feed", "Stay Informed with Smart Notifications"],
		featured: false,
		episodeLimit: 0,
	},
	{
		priceId: "pri_01k1dzhm5ccevk59y626z80mmf",
		productTitle: "Casual Listener",
		planId: "CASUAL_LISTENER",
		icon: "/assets/icons/price-tiers/free-icon.svg",
		features: [
			"Stay Informed with Smart Notifications",
			"Pre-curated Bundles: For ultimate convenience, we've created three special 'Editor's Choice' bundles. Each bundle is a thoughtfully assembled package of 5 shows centred around a specific theme refreshed monthly by our team to ensure the content remains relevant and exciting.",
			"Custom Feed Selection: Our team handpicks a selection of approximately 25 high-quality podcast shows. You have the flexibility to choose up to 5 individual shows from this curated list to form your custom collection.",
		],
		description: "Enhanced experience with more  bundle selections and priority access",
		episodeLimit: 0,
		featured: true,
	},
	{
		priceId: "pri_01k23mdwkrr8g9cp7bdbp8xqm8",
		productTitle: "Curate Control",
		planId: "CURATE_CONTROL",
		icon: "/assets/icons/price-tiers/free-icon.svg",
		features: [
			"Stay Informed with Smart Notifications",
			"Pre-curated Bundles: For ultimate convenience, we've created three special 'Editor's Choice' bundles. Each bundle is a thoughtfully assembled package of 5 shows centred around a specific theme refreshed monthly by our team to ensure the content remains relevant and exciting.",
			"Custom Feed Selection: Our team handpicks a selection of approximately 25 high-quality podcast shows. You have the flexibility to choose up to 5 individual shows from this curated list to form your custom collection.",
		],
		description: "Ultimate control with unlimited custom curation profiles",
		episodeLimit: 100,
		featured: false,
	},
];

export { PRICING_TIER };
