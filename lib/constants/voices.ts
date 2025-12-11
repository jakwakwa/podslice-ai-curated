export const VOICE_OPTIONS = [
	{
		name: "Leda",
		label: "Leda — Youthful",
		sample: "This is a quick voice sample for your episode.",
	},
	{
		name: "Sulafat",
		label: "Sulafat — Warm Middle Pitch",
		sample: "What idea do you want to bring to life?",
	},
	{ name: "Orus", label: "Orus — Firm", sample: "What's a skill you'd like to develop?" },
	{
		name: "Rasalgethi",
		label: "Rasalgethi — Informative",
		sample: "Ready to learn something awesome today?",
	},
	{
		name: "Achird",
		label: "Achird — Friendly",
		sample: "Howdy! Let's dive into some key insights",
	},
	{
		name: "Aoede",
		label: "Aoede — Breezy",
		sample: "What kind of problem could we solve?",
	},
] as const;

export const VOICE_NAMES = VOICE_OPTIONS.map(v => v.name) as readonly string[];
