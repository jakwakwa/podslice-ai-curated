import { auth } from "@clerk/nextjs/server";
import { PlanGate } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Plan gate validation function
function resolveAllowedGates(plan: string | null | undefined): PlanGate[] {
	const normalized = (plan || "").toString().trim().toLowerCase();

	// Implement hierarchical access model:
	// NONE = only NONE access
	// FREE_SLICE = NONE + FREE_SLICE access
	// CASUAL = NONE + FREE_SLICE + CASUAL access
	// CURATE_CONTROL = ALL access (NONE + FREE_SLICE + CASUAL + CURATE_CONTROL)

	// Handle various plan type formats that might be stored in the database
	if (normalized === "curate_control" || normalized === "curate control") {
		return [
			PlanGate.NONE,
			PlanGate.FREE_SLICE,
			PlanGate.CASUAL_LISTENER,
			PlanGate.CURATE_CONTROL,
		];
	}
	if (
		normalized === "casual_listener" ||
		normalized === "casual listener" ||
		normalized === "casual"
	) {
		return [PlanGate.NONE, PlanGate.FREE_SLICE, PlanGate.CASUAL_LISTENER];
	}
	if (
		normalized === "free_slice" ||
		normalized === "free slice" ||
		normalized === "free" ||
		normalized === "freeslice"
	) {
		return [PlanGate.NONE, PlanGate.FREE_SLICE];
	}
	// Default: NONE plan or no plan
	return [PlanGate.NONE];
}

export async function GET(_request: Request) {
	try {
		const { userId } = await auth();

		if (!userId) {
			console.log("User curation profiles API: No userId, returning 401");
			return new NextResponse("Unauthorized", { status: 401 });
		}

		const userCurationProfile = await prisma.userCurationProfile.findFirst({
			where: { user_id: userId, is_active: true },
			include: {
				episodes: true,
				selectedBundle: {
					include: {
						bundle_podcast: { include: { podcast: true } },
					},
				},
			},
		});

		if (!userCurationProfile) {
			console.log("User curation profiles API: No profile found, returning null");
			return NextResponse.json(null);
		}

		// Compute bundle episodes by podcast membership (podcast-centric model)
		let computedBundleEpisodes: unknown[] = [];
		if (userCurationProfile.selectedBundle) {
			const podcastIds = userCurationProfile.selectedBundle.bundle_podcast.map(
				(bp: { podcast_id: string }) => bp.podcast_id
			);
			if (podcastIds.length > 0) {
				computedBundleEpisodes = await prisma.episode.findMany({
					where: { podcast_id: { in: podcastIds } },
					include: {
						podcast: true,
						userProfile: true,
					},
					orderBy: { published_at: "desc" },
				});
			}
		}

		const transformedProfile = {
			...userCurationProfile,
			selectedBundle: userCurationProfile.selectedBundle
				? {
						...userCurationProfile.selectedBundle,
						podcasts: userCurationProfile.selectedBundle.bundle_podcast.map(
							(bp: { podcast: unknown }) => bp.podcast
						),
						episodes: computedBundleEpisodes,
					}
				: null,
		};

		return NextResponse.json(transformedProfile);
	} catch (error) {
		console.error("[USER_CURATION_PROFILES_GET]", error);
		return new NextResponse("Internal Error", { status: 500 });
	}
}

export async function POST(request: Request) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = await request.json();
		const { name, isBundleSelection, selectedBundleId, selectedPodcasts } = body;

		// Validate required fields
		if (!name || typeof isBundleSelection !== "boolean") {
			return NextResponse.json(
				{ error: "Name and isBundleSelection are required" },
				{ status: 400 }
			);
		}

		// Check if user already has an active profile
		const existingProfile = await prisma.userCurationProfile.findFirst({
			where: { user_id: userId, is_active: true },
		});

		if (existingProfile) {
			return NextResponse.json(
				{ error: "User already has an active profile" },
				{ status: 409 }
			);
		}

		// Get user's subscription plan
		const subscription = await prisma.subscription.findFirst({
			where: { user_id: userId },
			orderBy: { updated_at: "desc" },
		});
		const userPlan = subscription?.plan_type ?? null;

		// Validate bundle selection if applicable
		if (isBundleSelection && selectedBundleId) {
			const bundle = await prisma.bundle.findUnique({
				where: { bundle_id: selectedBundleId },
			});

			if (!bundle) {
				return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
			}

			// Check plan gate access
			const allowedGates = resolveAllowedGates(userPlan);
			const canInteract = allowedGates.some(
				allowedGate => allowedGate === bundle.min_plan
			);
			if (!canInteract) {
				return NextResponse.json(
					{
						error: "Bundle requires a higher plan",
						requiredPlan: bundle.min_plan,
					},
					{ status: 403 }
				);
			}
		}

		// Validate podcast selection if applicable
		if (!isBundleSelection && (!selectedPodcasts || selectedPodcasts.length === 0)) {
			return NextResponse.json(
				{ error: "At least one podcast must be selected for custom profiles" },
				{ status: 400 }
			);
		}

		if (!isBundleSelection && selectedPodcasts && selectedPodcasts.length > 5) {
			return NextResponse.json(
				{ error: "Maximum 5 podcasts allowed for custom profiles" },
				{ status: 400 }
			);
		}

		// Create the profile
		const profile = await prisma.userCurationProfile.create({
			data: {
				name,
				user_id: userId,
				is_bundle_selection: isBundleSelection,
				selected_bundle_id: isBundleSelection ? selectedBundleId : null,
				is_active: true,
			},
			include: {
				selectedBundle: {
					include: {
						bundle_podcast: { include: { podcast: true } },
					},
				},
			},
		});

		// Transform the response
		const transformedProfile = {
			...profile,
			selectedBundle: profile.selectedBundle
				? {
						...profile.selectedBundle,
						podcasts: profile.selectedBundle.bundle_podcast.map(
							(bp: { podcast: unknown }) => bp.podcast
						),
					}
				: null,
		};

		return NextResponse.json(transformedProfile, { status: 201 });
	} catch (error) {
		console.error("[USER_CURATION_PROFILES_POST]", error);
		return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
	}
}
