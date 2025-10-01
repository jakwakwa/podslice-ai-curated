import { auth } from "@clerk/nextjs/server"
import { PlanGate } from "@prisma/client"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

interface RouteParams {
	params: Promise<{ id: string }>
}

// Plan gate validation function - same as in main route
function resolveAllowedGates(plan: string | null | undefined): PlanGate[] {
	const normalized = (plan || "").toString().trim().toLowerCase()

	// Implement hierarchical access model:
	// NONE = only NONE access
	// FREE_SLICE = NONE + FREE_SLICE access
	// CASUAL = NONE + FREE_SLICE + CASUAL access
	// CURATE_CONTROL = ALL access (NONE + FREE_SLICE + CASUAL + CURATE_CONTROL)

	// Handle various plan type formats that might be stored in the database
	if (normalized === "curate_control" || normalized === "curate control") {
		return [PlanGate.NONE, PlanGate.FREE_SLICE, PlanGate.CASUAL_LISTENER, PlanGate.CURATE_CONTROL]
	}
	if (normalized === "casual_listener" || normalized === "casual listener" || normalized === "casual") {
		return [PlanGate.NONE, PlanGate.FREE_SLICE, PlanGate.CASUAL_LISTENER]
	}
	if (normalized === "free_slice" || normalized === "free slice" || normalized === "free" || normalized === "freeslice") {
		return [PlanGate.NONE, PlanGate.FREE_SLICE]
	}
	// Default: NONE plan or no plan
	return [PlanGate.NONE]
}

export async function GET(_request: Request, { params }: RouteParams) {
	try {
		const { userId } = await auth()

		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		const { id } = await params

		if (!id) {
			return NextResponse.json({ error: "User Curation Profile ID is required" }, { status: 400 })
		}

		const userCurationProfile = await prisma.userCurationProfile.findUnique({
			where: { profile_id: id, user_id: userId },
			include: { selectedBundle: true },
		})

		if (!userCurationProfile) {
			return NextResponse.json({ error: "User Curation Profile not found" }, { status: 404 })
		}

		return NextResponse.json(userCurationProfile)
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error)
		console.error("[USER_CURATION_PROFILE_GET_BY_ID]", message)
		return NextResponse.json({ error: "Internal Error" }, { status: 500 })
	}
}

export async function PATCH(request: Request, { params }: RouteParams) {
	try {
		const { userId } = await auth()

		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		const { id } = await params

		if (!id) {
			return NextResponse.json({ error: "User Curation Profile ID is required" }, { status: 400 })
		}

		const body = await request.json()
		const { name, selected_bundle_id } = body

		const hasUpdateData = name || selected_bundle_id
		if (!hasUpdateData) {
			return NextResponse.json({ error: "No update data provided" }, { status: 400 })
		}

		const existingProfile = await prisma.userCurationProfile.findUnique({
			where: { profile_id: id, user_id: userId },
		})

		if (!existingProfile) {
			return NextResponse.json({ error: "User Curation Profile not found or unauthorized" }, { status: 404 })
		}

		const dataToUpdate: {
			name?: string
			selected_bundle_id?: string
			is_bundle_selection?: boolean
		} = {}

		if (name) dataToUpdate.name = name

		if (selected_bundle_id) {
			const [bundle, sub] = await Promise.all([
				prisma.bundle.findUnique({ where: { bundle_id: selected_bundle_id } }),
				prisma.subscription.findFirst({ where: { user_id: userId }, orderBy: { updated_at: "desc" } }),
			])
			if (!bundle) {
				return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
			}
			const plan = sub?.plan_type ?? null
			const gate = bundle.min_plan

			// Use the same hierarchical access model
			const allowedGates = resolveAllowedGates(plan)
			const allowed = allowedGates.some(allowedGate => allowedGate === gate)

			if (!allowed) {
				return NextResponse.json({ error: "Bundle requires a higher plan", requiredPlan: gate }, { status: 403 })
			}
			dataToUpdate.selected_bundle_id = selected_bundle_id
			dataToUpdate.is_bundle_selection = true
		}

		const updatedUserCurationProfile = await prisma.userCurationProfile.update({
			where: { profile_id: id },
			data: dataToUpdate,
		})

		return NextResponse.json(updatedUserCurationProfile)
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error)
		console.error("[USER_CURATION_PROFILE_PATCH]", message)
		return NextResponse.json({ error: "Internal Error" }, { status: 500 })
	}
}

export async function DELETE(_request: Request, { params }: RouteParams) {
	try {
		const { userId } = await auth()

		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		const { id } = await params

		if (!id) {
			return NextResponse.json({ error: "User Curation Profile ID is required" }, { status: 400 })
		}

		// Deactivate the user curation profile instead of deleting it
		const deactivatedUserCurationProfile = await prisma.userCurationProfile.update({
			where: { profile_id: id, user_id: userId },
			data: { is_active: false },
		})

		if (!deactivatedUserCurationProfile) {
			return NextResponse.json({ error: "User Curation Profile not found or unauthorized" }, { status: 404 })
		}

		return NextResponse.json({ message: "User Curation Profile deactivated successfully" })
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error)
		console.error("[USER_CURATION_PROFILE_DELETE]", message)
		return NextResponse.json({ error: "Internal Error" }, { status: 500 })
	}
}
