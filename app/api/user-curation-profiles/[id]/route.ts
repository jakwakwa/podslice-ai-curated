import { auth } from "@clerk/nextjs/server";
import { PlanGate } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
	params: Promise<{ id: string }>;
}

// Plan gate validation function - same as in main route
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

export async function GET(_request: Request, { params }: RouteParams) {
	try {
		const { userId } = await auth();

		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id } = await params;

		if (!id) {
			return NextResponse.json(
				{ error: "User Curation Profile ID is required" },
				{ status: 400 }
			);
		}

		const userCurationProfile = await prisma.userCurationProfile.findUnique({
			where: { profile_id: id, user_id: userId },
			include: {
				selectedBundle: true,
				selectedSharedBundle: true,
			},
		});

		if (!userCurationProfile) {
			return NextResponse.json(
				{ error: "User Curation Profile not found" },
				{ status: 404 }
			);
		}

		return NextResponse.json(userCurationProfile);
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		console.error("[USER_CURATION_PROFILE_GET_BY_ID]", message);
		return NextResponse.json({ error: "Internal Error" }, { status: 500 });
	}
}

export async function PATCH(request: Request, { params }: RouteParams) {
	try {
		const { userId } = await auth();

		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id } = await params;

		if (!id) {
			return NextResponse.json(
				{ error: "User Curation Profile ID is required" },
				{ status: 400 }
			);
		}

		const body = await request.json();
		const { name, selected_bundle_id, selected_shared_bundle_id } = body;

		const hasUpdateData = name || selected_bundle_id || selected_shared_bundle_id;
		if (!hasUpdateData) {
			return NextResponse.json({ error: "No update data provided" }, { status: 400 });
		}

		const existingProfile = await prisma.userCurationProfile.findUnique({
			where: { profile_id: id, user_id: userId },
		});

		if (!existingProfile) {
			return NextResponse.json(
				{ error: "User Curation Profile not found or unauthorized" },
				{ status: 404 }
			);
		}

		const dataToUpdate: {
			name?: string;
			selected_bundle_id?: string | null;
			selected_shared_bundle_id?: string | null;
			is_bundle_selection?: boolean;
		} = {};

		if (name) dataToUpdate.name = name;

		// Handle selecting a regular admin bundle
		if (selected_bundle_id !== undefined) {
			if (selected_bundle_id) {
				const [bundle, sub] = await Promise.all([
					prisma.bundle.findUnique({ where: { bundle_id: selected_bundle_id } }),
					prisma.subscription.findFirst({
						where: { user_id: userId },
						orderBy: { updated_at: "desc" },
					}),
				]);
				if (!bundle) {
					return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
				}
				const plan = sub?.plan_type ?? null;
				const gate = bundle.min_plan;

				// Use the same hierarchical access model
				const allowedGates = resolveAllowedGates(plan);
				const allowed = allowedGates.some(allowedGate => allowedGate === gate);

				if (!allowed) {
					return NextResponse.json(
						{ error: "Bundle requires a higher plan", requiredPlan: gate },
						{ status: 403 }
					);
				}
				dataToUpdate.selected_bundle_id = selected_bundle_id;
				// Do NOT clear shared bundle - user can have both!
				dataToUpdate.is_bundle_selection = true;
			} else {
				// Clear curated bundle selection only
				dataToUpdate.selected_bundle_id = null;
			}
		}

		// Handle selecting a shared bundle
		if (selected_shared_bundle_id !== undefined) {
			if (selected_shared_bundle_id) {
				const [sharedBundle, sub] = await Promise.all([
					prisma.sharedBundle.findUnique({
						where: { shared_bundle_id: selected_shared_bundle_id },
						include: { episodes: { where: { is_active: true } } },
					}),
					prisma.subscription.findFirst({
						where: { user_id: userId },
						orderBy: { updated_at: "desc" },
					}),
				]);
				if (!(sharedBundle && sharedBundle.is_active)) {
					return NextResponse.json(
						{ error: "Shared bundle not found or not active" },
						{ status: 404 }
					);
				}
				if (sharedBundle.episodes.length === 0) {
					return NextResponse.json(
						{ error: "Shared bundle has no active episodes" },
						{ status: 400 }
					);
				}

				const plan = sub?.plan_type ?? null;
				// Shared bundles require at least FREE_SLICE
				const allowedGates = resolveAllowedGates(plan);
				const allowed = allowedGates.some(gate => gate !== PlanGate.NONE);

				if (!allowed) {
					return NextResponse.json(
						{ error: "Shared bundles require at least Free Slice plan" },
						{ status: 403 }
					);
				}
				dataToUpdate.selected_shared_bundle_id = selected_shared_bundle_id;
				// Do NOT clear curated bundle - user can have both!
				dataToUpdate.is_bundle_selection = true;
			} else {
				// Clear shared bundle selection only
				dataToUpdate.selected_shared_bundle_id = null;
			}
		}

		const updatedUserCurationProfile = await prisma.userCurationProfile.update({
			where: { profile_id: id },
			data: dataToUpdate,
		});

		return NextResponse.json(updatedUserCurationProfile);
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		console.error("[USER_CURATION_PROFILE_PATCH]", message);
		return NextResponse.json({ error: "Internal Error" }, { status: 500 });
	}
}

export async function DELETE(_request: Request, { params }: RouteParams) {
	try {
		const { userId } = await auth();

		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id } = await params;

		if (!id) {
			return NextResponse.json(
				{ error: "User Curation Profile ID is required" },
				{ status: 400 }
			);
		}

		// Deactivate the user curation profile instead of deleting it
		const deactivatedUserCurationProfile = await prisma.userCurationProfile.update({
			where: { profile_id: id, user_id: userId },
			data: { is_active: false },
		});

		if (!deactivatedUserCurationProfile) {
			return NextResponse.json(
				{ error: "User Curation Profile not found or unauthorized" },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			message: "User Curation Profile deactivated successfully",
		});
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		console.error("[USER_CURATION_PROFILE_DELETE]", message);
		return NextResponse.json({ error: "Internal Error" }, { status: 500 });
	}
}
