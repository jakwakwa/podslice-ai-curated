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

	// Get the most recent subscription for plan_type evaluation
	const subscription = await prisma.subscription.findFirst({
		where: { user_id: userId },
		orderBy: { updated_at: "desc" },
		select: { plan_type: true },
	});

	const plan = subscription?.plan_type?.toLowerCase() ?? null;
	const allowed = plan === "free_slice" || plan === "curate_control";

	if (!allowed) {
		// Redirect non-eligible plans away from this feature page
		redirect("/dashboard");
	}

	return <>{children}</>;
}
