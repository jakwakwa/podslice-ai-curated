/**
 * Curated Bundles page content
 * Centralized static copy and configuration for the curated bundles page
 */

export const curatedBundlesPageContent = {
	header: {
		title: "Discover Channels",
		description: `Subscribe to channels and new audio and text summaries will appear in your feed automatically weekly or daily`,
	},
	filters: {
		searchPlaceholder: "Search a topic or show...",
		searchLabel: "Search bundles or podcasts",
		planLabel: "Filter by Plan",
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
