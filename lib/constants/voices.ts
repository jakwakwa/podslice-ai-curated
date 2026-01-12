/**
 * Voice configuration for TTS providers.
 * Each voice profile contains both Google (Gemini) and ElevenLabs provider info.
 * Google is the primary provider (cost/speed), ElevenLabs is the fallback (reliability).
 */

export interface VoiceOption {
	/** Internal identifier (used in DB/events) */
	id: string;
	/** Human-readable label for UI */
	label: string;
	/** Sample text for preview */
	sample: string;
	/** Google Cloud TTS model name for primary provider */
	googleVoiceName: string;
	/** ElevenLabs Voice ID for fallback provider */
	elevenLabsId: string;
	/** Direct URL to pre-generated sample MP3 (optional) */
	sampleUrl?: string;
}

/**
 * B2B Finance voice archetypes.
 * - Strategist: Deep, steady voice for long-form analysis
 * - Newsroom: Fast-paced news delivery style
 * - Technical Lead: Precise, clear technical explanations
 */
export const VOICE_OPTIONS: readonly VoiceOption[] = [
	{
		id: "Strategist",
		label: "The Strategist (Deep/Steady)",
		sample: "Market signals are aligning with long-term macroeconomic trends.",
		googleVoiceName: "Charon",
		elevenLabsId: "", // Deprecated
	},
	{
		id: "Newsroom",
		label: "The Newsroom (Fast/Daily)",
		sample: "Breaking news: Major institutional inflow into spot ETFs today.",
		googleVoiceName: "Kore", // Female, clear
		elevenLabsId: "", // Deprecated
	},
	{
		id: "TechnicalLead",
		label: "The Technical Lead (Precise/Clear)",
		sample: "Bitcoin's hash rate distribution shows significant resilience.",
		googleVoiceName: "Puck", // Generic male, clear
		elevenLabsId: "", // Deprecated
	},
	{
		id: "Analyst",
		label: "The Analyst (Rough/Direct)",
		sample: "The data suggests a strong reversal in the coming quarter.",
		googleVoiceName: "Fenrir", // Deep, rough
		elevenLabsId: "", // Deprecated
	},
	{
		id: "Presenter",
		label: "The Presenter (High/Energetic)",
		sample: "Welcome back to the show! We have some exciting updates.",
		googleVoiceName: "Aoede", // High-pitched female
		elevenLabsId: "", // Deprecated
	},
] as const;

/** Array of voice IDs for validation */
export const VOICE_IDS = VOICE_OPTIONS.map(v => v.id) as readonly string[];

/** Legacy alias for backwards compatibility */
export const VOICE_NAMES = VOICE_IDS;

/**
 * Look up a voice configuration by its ID.
 * @param id - The voice ID to look up (e.g., "Strategist")
 * @returns The VoiceOption or undefined if not found
 */
export function getVoiceById(id: string): VoiceOption | undefined {
	return VOICE_OPTIONS.find(v => v.id === id);
}

/**
 * Get the default voice configuration.
 * Used when no specific voice is selected (e.g., single-speaker mode).
 */
export function getDefaultVoice(): VoiceOption {
	// VOICE_OPTIONS is a const array with at least one element, so index 0 always exists
	return VOICE_OPTIONS[0] as VoiceOption;
}
