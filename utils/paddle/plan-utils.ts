import { PlanGate } from "@prisma/client";
import { PRICING_TIER } from "@/config/paddle-config";

function planGateToDbString(plan: PlanGate): string {
	return plan.toLowerCase();
}

export function priceIdToPlanType(priceId: string | null | undefined): string | null {
	if (!priceId) return null;
	const tier = PRICING_TIER.find(t => t.priceId === priceId);
	if (!tier) return null;
	return planGateToDbString(tier.planId);
}

/**
 * Resolves allowed plan gates based on user's subscription plan
 * Implements hierarchical access model:
 * - NONE = only NONE access
 * - FREE_SLICE = NONE + FREE_SLICE access
 * - CASUAL_LISTENER = NONE + FREE_SLICE + CASUAL_LISTENER access
 * - CURATE_CONTROL = ALL access (NONE + FREE_SLICE + CASUAL_LISTENER + CURATE_CONTROL)
 */
export function resolveAllowedGates(plan: string | null | undefined): PlanGate[] {
	const normalized = (plan || "").toString().trim().toLowerCase();

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

/**
 * Checks if user has access to a specific plan gate
 */
export function hasPlanAccess(
	plan: string | null | undefined,
	requiredGate: PlanGate
): boolean {
	const allowedGates = resolveAllowedGates(plan);
	return allowedGates.includes(requiredGate);
}

/**
 * Checks if user has Curate Control level access
 */
export function hasCurateControlAccess(plan: string | null | undefined): boolean {
	return hasPlanAccess(plan, PlanGate.CURATE_CONTROL);
}
