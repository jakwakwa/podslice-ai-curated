import { auth } from "@clerk/nextjs/server";
import { PlanGate, type Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Podcast } from "@/lib/types";

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

		type UserCurationProfileWithRelations = Prisma.UserCurationProfileGetPayload<{
			include: {
				episodes: true;
				selectedBundle: {
					include: {
						bundle_podcast: {
							include: { podcast: true };
						};
					};
				};
			};
		}>;

		const userCurationProfile: UserCurationProfileWithRelations | null =
			await prisma.userCurationProfile.findFirst({
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
		type EpisodeWithRelations = Prisma.EpisodeGetPayload<{
			include: {
				podcast: true;
				userProfile: true;
			};
		}>;

		let computedBundleEpisodes: EpisodeWithRelations[] = [];
		if (userCurationProfile.selectedBundle) {
			const podcastIds: string[] = userCurationProfile.selectedBundle.bundle_podcast.map(
				bp => bp.podcast_id
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

		// Extract scalar fields from podcasts, excluding relations
		const podcasts: Podcast[] = userCurationProfile.selectedBundle
			? userCurationProfile.selectedBundle.bundle_podcast.map(bp => {
					// bp.podcast is the full Prisma Podcast type with relations from the include
					// Extract only scalar fields
					const podcast = bp.podcast;
					const {
						podcast_id,
						name,
						description,
						url,
						image_url,
						category,
						is_active,
						owner_user_id,
						created_at,
					} = podcast;
					return {
						podcast_id,
						name,
						description,
						url,
						image_url,
						category,
						is_active,
						owner_user_id,
						created_at,
					} as Podcast;
				})
			: [];

		const transformedProfile = {
			...userCurationProfile,
			selectedBundle: userCurationProfile.selectedBundle
				? {
						...userCurationProfile.selectedBundle,
						podcasts,
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

		const body = (await request.json()) as {
			name?: string;
			isBundleSelection?: boolean;
			selectedBundleId?: string;
			selectedPodcasts?: string[];
		};
		const { name, isBundleSelection, selectedBundleId, selectedPodcasts } = body;

		// Validate required fields
		if (!name || typeof isBundleSelection !== "boolean") {
			return NextResponse.json(
				{ error: "Name and isBundleSelection are required" },
				{ status: 400 }
			);
		}

		// Check if user already has an active profile
		const existingProfile: Prisma.$UserCurationProfilePayload["scalars"] | null =
			await prisma.userCurationProfile.findFirst({
				where: { user_id: userId, is_active: true },
			});

		if (existingProfile) {
			return NextResponse.json(
				{ error: "User already has an active profile" },
				{ status: 409 }
			);
		}

		// Get user's subscription plan
		const subscription: Prisma.$SubscriptionPayload["scalars"] | null =
			await prisma.subscription.findFirst({
				where: { user_id: userId },
				orderBy: { updated_at: "desc" },
			});
		const userPlan: string | null = subscription?.plan_type ?? null;

		// Validate bundle selection if applicable
		if (isBundleSelection && selectedBundleId) {
			const bundle: Prisma.$BundlePayload["scalars"] | null =
				await prisma.bundle.findUnique({
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
		type CreatedProfile = Prisma.UserCurationProfileGetPayload<{
			include: {
				selectedBundle: {
					include: {
						bundle_podcast: {
							include: { podcast: true };
						};
					};
				};
			};
		}>;

		const profile: CreatedProfile = await prisma.userCurationProfile.create({
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

		// Extract scalar fields from podcasts, excluding relations
		const podcasts: Podcast[] = profile.selectedBundle
			? profile.selectedBundle.bundle_podcast.map(bp => {
					// bp.podcast is the full Prisma Podcast type with relations from the include
					// Extract only scalar fields
					const podcast = bp.podcast;
					const {
						podcast_id,
						name,
						description,
						url,
						image_url,
						category,
						is_active,
						owner_user_id,
						created_at,
					} = podcast;
					return {
						podcast_id,
						name,
						description,
						url,
						image_url,
						category,
						is_active,
						owner_user_id,
						created_at,
					} as Podcast;
				})
			: [];

		// Transform the response
		const transformedProfile = {
			...profile,
			selectedBundle: profile.selectedBundle
				? {
						...profile.selectedBundle,
						podcasts,
					}
				: null,
		};

		return NextResponse.json(transformedProfile, { status: 201 });
	} catch (error) {
		console.error("[USER_CURATION_PROFILES_POST]", error);
		return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
	}
}
