export const VOICE_OPTIONS = [
	{ name: "Zephyr", label: "Zephyr — Bright", sample: "This is a quick voice sample for your episode." },
	{ name: "Charon", label: "Charon — Informative", sample: "This is a quick voice sample for your episode." },
	{ name: "Kore", label: "Kore — Firm", sample: "This is a quick voice sample for your episode." },
	{ name: "Leda", label: "Leda — Youthful", sample: "This is a quick voice sample for your episode." },
	{ name: "Sadachbia", label: "Sadachbia — Lively", sample: "This is a quick voice sample for your episode." },
	{ name: "Achird", label: "Achird — Friendly", sample: "This is a quick voice sample for your episode." },
	{ name: "Schedar", label: "Schedar — Even", sample: "This is a quick voice sample for your episode." },
] as const;

export const VOICE_NAMES = VOICE_OPTIONS.map(v => v.name) as readonly string[];
