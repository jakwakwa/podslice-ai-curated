import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactElement, ReactNode } from "react";
import { GlobalProgressBar } from "@/components/ui/global-progress-bar";
import { prisma } from "@/lib/prisma";
import AdminTabs from "./_components/admin-tabs.client";

export const metadata: Metadata = {
	title: "Admin Portal",
};

export default async function AdminLayout({ children }: { children: ReactNode }): Promise<ReactElement> {
	// Server-side guard: only ADMIN members may access any /admin route
	const { userId } = await auth();

	// If somehow unauthenticated reaches here, rely on existing middleware, but also hard-redirect
	if (!userId) {
		redirect("/sign-in");
	}

	const user = await prisma.user.findUnique({ where: { user_id: userId }, select: { is_admin: true } });

	if (!user?.is_admin) {
		// Non-admins are redirected away from the admin portal
		redirect("/dashboard");
	}

	return (
		<div>
			{/* Thin top progress bar */}
			<GlobalProgressBar />
			{/* Tabs */}
			<AdminTabs />
			<div className="max-w-6xl mx-auto">{children}</div>
		</div>
	);
}
