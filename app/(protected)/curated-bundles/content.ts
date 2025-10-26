/**
 * Curated Bundles page content
 * Centralized static copy and configuration for the curated bundles page
 */

export const curatedBundlesPageContent = {
	header: {
		title: "Explore Bundles",
		description:
			"Choose from our pre-curated podcast bundles created by our AI or discover bundles shared by other users. Each bundle is linked to a group of podcast shows. Each week we generate a new bundle of freshly generated summaries from the previous week's curated selection of shows.",
	},
	filters: {
		searchPlaceholder: "Search bundles or podcasts...",
		searchLabel: "Search bundles or podcasts",
		planLabel: "Minimum plan",
		allPlansLabel: "All plans",
		buttons: {
			search: "Search",
			clear: "Clear",
		},
	},
	bundleTypes: {
		curated: {
			label: "Curated Bundle",
			description: "AI-curated podcast collection",
		},
		shared: {
			label: "Shared Bundle",
			description: "User-created bundle",
			sharedByLabel: "Shared by",
			episodesLabel: "episodes",
		},
	},
	bundleCard: {
		selectButton: "Select Bundle",
		viewDetailsButton: "View Details",
		lockedLabel: "Locked",
		podcastsLabel: "Podcasts",
		episodesLabel: "Episodes",
	},
	states: {
		error: {
			title: "Unable to Load Bundles",
			description: "An error occurred while loading bundles. Please try again.",
		},
		empty: {
			title: "No Bundles Found",
			description:
				"No bundles match your current filters. Try adjusting your search or filter criteria.",
		},
		loading: {
			message: "Loading bundles...",
		},
	},
	dialog: {
		select: {
			title: "Select Bundle",
			description:
				"Are you sure you want to select this bundle? This will become your active weekly feed.",
			confirmButton: "Confirm Selection",
			cancelButton: "Cancel",
		},
		locked: {
			title: "Bundle Locked",
			description: "This bundle requires a higher plan tier.",
			upgradeButton: "Upgrade Plan",
			closeButton: "Close",
		},
	},
} as const;
