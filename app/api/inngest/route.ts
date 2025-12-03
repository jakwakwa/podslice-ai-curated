import { serve } from "inngest/next";
// Legacy Gemini TTS functions removed; using new admin episode generator
import { generateAdminEpisode } from "@/lib/inngest/admin-episode-generator";
import { inngest } from "@/lib/inngest/client";
import {
	sendEpisodeFailedEmail,
	sendEpisodeReadyEmail,
} from "@/lib/inngest/email-sender";
import { geminiVideoWorker } from "@/lib/inngest/providers/gemini-video-worker";
import { enqueueTranscriptionJob } from "@/lib/inngest/transcribe-from-metadata";
import { transcriptionCoordinator } from "@/lib/inngest/transcription-saga";
import { generateUserEpisode } from "@/lib/inngest/user-episode-generator";
import { generateUserEpisodeMulti } from "@/lib/inngest/user-episode-generator-multi";
import { generateUserNewsEpisode } from "@/lib/inngest/user-news-episode-generator";

export const maxDuration = 300; // 5 minutes for Inngest job processing

export const { GET, POST, PUT } = serve({
	client: inngest,
	functions: [
		generateAdminEpisode,
		generateUserEpisode,
		generateUserEpisodeMulti,
		generateUserNewsEpisode,
		enqueueTranscriptionJob,
		transcriptionCoordinator,
		geminiVideoWorker,
		sendEpisodeReadyEmail,
		sendEpisodeFailedEmail,
	],
	streaming: "allow",
});
