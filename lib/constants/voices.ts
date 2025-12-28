export const VOICE_OPTIONS = [
	{
		name: "Strategist",
		label: "The Strategist (Deep/Steady)",
		sample: "Market signals are aligning with long-term macroeconomic trends.",
	},
	{
		name: "TechnicalLead",
		label: "The Technical Lead (Precise/Clear)",
		sample: "Bitcoin's hash rate distribution shows significant resilience.",
	},
	{
		name: "Newsroom",
		label: "The Newsroom (Fast/Daily)",
		sample: "Breaking news: Major institutional inflow into spot ETFs today.",
	},
] as const;

export const VOICE_NAMES = VOICE_OPTIONS.map(v => v.name) as readonly string[];
