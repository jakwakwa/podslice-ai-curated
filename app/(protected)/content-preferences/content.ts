export const contentPreferencesContent = {
	page: {
		title: "Automated Content Preferences",
		description: "Configure your content preferences for the automated pipeline",
	},
	section: {
		title: "Configure Your Preferences",
		description: "Select your content sources for automated weekly ingestion",
	},
	topics: {
		label: "Topics of Interest",
		helperText: "Choose up to 2 topics",
		options: [
			"Technology",
			"Business",
			"Science",
			"Health",
			"Politics",
			"Entertainment",
			"Pshychology",
			"Finances",
			"Investing/Stock Market",
			"Crypto",
		],
	},
	youtubeChannels: {
		label: "YouTube Channel or Playlist",
		helperText: "Daily automated fetching of new videos",
		description: "Enter a YouTube channel or playlist URL to automatically fetch new videos daily at 9:00 AM",
		placeholder: "https://www.youtube.com/@ChannelName or https://www.youtube.com/playlist?list=PLxxx",
	},
	rssFeeds: {
		label: "RSS Feeds",
		helperText: "Select up to 2 news sources",
		options: ["TechCrunch", "Hacker News", "The Verge", "Ars Technica", "Reddit"],
	},
	advanced: {
		title: "Advanced",
		lable_option_one: "News Source #1",
		lable_option_two: "News Source #2",
		description: "Pick from a variety of news sources",
		newsFeeds: ["BBC", "Reuters"],
	},
	buttons: {
		save: "Save Preferences",
	},
};
