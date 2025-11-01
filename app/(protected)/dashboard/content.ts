/**
 * Dashboard page content
 * Centralized static copy and configuration for the dashboard
 */

export const dashboardCopy = {
	header: {
		title: "Your dashboard",
		description:
			"This is your dashboard. Here you can manage your bundle selection and view your recently generated summaries.",
	},
	sections: {
		bundleFeed: {
			title: "Your Feed Details",
			updateButton: "Edit Channel Selection",
			activeBundleLabel: "Channel Content:",
			summaryLabel: "Channel Summaries",
			personalFeedLabel: "Personal Content:",
			pesdonalFeedTitle: " Personal Content Overview:",
			bundledEpisodesLabel: "Channel Summaries:",
			planLabel: "Membersip Plan:",
		},
		latestBundle: {
			title: "Latest from your active bundle",
			badge: "New",
			descriptionTemplate: (bundleName: string) =>
				`See your latest roundup episodes here from ${bundleName}`,
		},
		recentEpisodes: {
			title: "Recently created episodes",
			description: "View and manage your recently generated summaries.",
			emptyState: "No generated summaries yet.",
			buttons: {
				myEpisodes: "My Episodes",
				episodeCreator: "Episode Creator",
			},
		},
		emptyState: {
			title: "Would you like to get started with your feed?",
			description:
				"You haven't created a Weekly Bundled Feed yet. Create one to start managing your podcast curation.",
			button: "Select a Bundle",
		},
		wizard: {
			title: "Personalized Feed Builder",
		},
	},
} as const;
