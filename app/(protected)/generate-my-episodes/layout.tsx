import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { ReactElement, ReactNode } from "react";
import { prisma } from "@/lib/prisma";

// Only FREE_SLICE and CURATE_CONTROL members may access this route
export default async function GenerateMyEpisodesLayout({ children }: { children: ReactNode }): Promise<ReactElement> {
	const { userId } = await auth();
	if (!userId) {
		redirect("/sign-in");
	}

	// Get latest subscription by last update
	const subscription = await prisma.subscription.findFirst({
		where: { user_id: userId },
		orderBy: { updated_at: "desc" },
		select: { plan_type: true, status: true, cancel_at_period_end: true, current_period_end: true },
	});

	const plan = subscription?.plan_type?.toLowerCase() ?? null;
	const status = subscription?.status?.toLowerCase() ?? null;
	const isActiveLike = status === "active" || status === "trialing" || status === "paused";

	const isFreeSlice = plan === "free_slice";
	const isCurateControl = plan === "curate_control";
	const allowed = isFreeSlice || (isCurateControl && isActiveLike);

	if (!allowed) {
		redirect("/manage-membership?expired=1");
	}

	return <>{children}</>;
}
