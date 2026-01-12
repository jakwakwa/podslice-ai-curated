/**
 * Episodes page content
 * Centralized static copy and configuration for the episodes page
 */

export const episodesPageContent = {
	header: {
		title: "Curated Feed",
		description: `A list of all generated summaries generated via channels you are actively subscribed to`,
	},
	filters: {
		label: "Filter:",
		selectPlaceholder: "Select bundle type",
		options: {
			all: "All Subscribed Channels",
			curated: "Your Active PODSLICE Channel",
			shared: "Yoour Active PUBLIC Channel",
		},
	},
	sections: {
		all: {
			title: "All Summaries",
			description:
				"The generated content from all your active bundles. You can filter by bundle type to see all episodes from your active bundle.",
		},
		curated: {
			title: "Curated Bundle Summaries",
			description:
				"The weekly generated content from podslice curated  bundles you are subscribed to.",
		},
		shared: {
			title: "Shared Bundle Episodes",
			description:
				"The generated content from publically shared  bundles you are subscribed to.",
		},
	},
	states: {
		error: {
			title: "Unable to Load Episodes",
			button: "Try Again",
		},
		empty: {
			title: "No Episodes Available",
			description:
				"There are no episodes available at the moment. Create a personal feed or select a bundle to start getting episodes.",
		},
	},
} as const;
