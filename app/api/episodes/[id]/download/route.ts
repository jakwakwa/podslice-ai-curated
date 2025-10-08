import { auth } from "@clerk/nextjs/server";
import { PlanGate } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Plan gate validation function - same as in other routes
function resolveAllowedGates(plan: string | null | undefined): PlanGate[] {
	const normalized = (plan || "").toString().trim().toLowerCase();

	// Implement hierarchical access model
	if (normalized === "curate_control" || normalized === "curate control") {
		return [PlanGate.NONE, PlanGate.FREE_SLICE, PlanGate.CASUAL_LISTENER, PlanGate.CURATE_CONTROL];
	}
	if (normalized === "casual_listener" || normalized === "casual listener" || normalized === "casual") {
		return [PlanGate.NONE, PlanGate.FREE_SLICE, PlanGate.CASUAL_LISTENER];
	}
	if (normalized === "free_slice" || normalized === "free slice" || normalized === "free" || normalized === "freeslice") {
		return [PlanGate.NONE, PlanGate.FREE_SLICE];
	}
	// Default: NONE plan or no plan
	return [PlanGate.NONE];
}

interface RouteParams {
	params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
	try {
		const { userId } = await auth();

		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id } = await params;
		const episodeId = id;

		// Get user's subscription to check plan tier
		const subscription = await prisma.subscription.findFirst({
			where: { user_id: userId },
			orderBy: { updated_at: "desc" },
		});

		let plan: string | null = subscription?.plan_type ?? null;

		// Admin bypass: treat admin as highest plan
		const user = await prisma.user.findUnique({
			where: { user_id: userId },
			select: { is_admin: true },
		});
		if (user?.is_admin) {
			plan = "curate_control";
		}

		const allowedGates = resolveAllowedGates(plan);
		const canDownload = allowedGates.includes(PlanGate.CURATE_CONTROL);

		if (!canDownload) {
			return NextResponse.json({ error: "Download feature requires Curate Control subscription tier" }, { status: 403 });
		}

		// Get the episode and verify it's user-generated (has profile_id)
		const episode = await prisma.episode.findUnique({
			where: { episode_id: episodeId },
			include: {
				userProfile: {
					select: {
						user_id: true,
					},
				},
			},
		});

		if (!episode) {
			return NextResponse.json({ error: "Episode not found" }, { status: 404 });
		}

		// Check if episode is user-generated and belongs to the requesting user
		if (!episode.profile_id || episode.userProfile?.user_id !== userId) {
			return NextResponse.json({ error: "Download is only available for your own user-generated episodes" }, { status: 403 });
		}

		// Return the audio URL for download
		return NextResponse.json({
			audio_url: episode.audio_url,
			title: episode.title,
			filename: `${episode.title.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_")}.mp3`,
		});
	} catch (error) {
		console.error("Episode download API error:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

