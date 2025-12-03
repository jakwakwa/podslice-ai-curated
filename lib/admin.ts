import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function isAdmin(): Promise<boolean> {
	try {
		const { userId } = await auth();
		if (!userId) return false;

		// Check user role in database instead of environment variable
		const user = await prisma.user.findUnique({
			where: { user_id: userId },
			select: { role: true },
		});

		return user?.role === "ADMIN";
	} catch (error) {
		console.error("Error checking admin status:", error);
		return false;
	}
}

export async function requireAdmin() {
	const adminStatus = await isAdmin();
	if (!adminStatus) {
		throw new Error("Admin access required");
	}
}
