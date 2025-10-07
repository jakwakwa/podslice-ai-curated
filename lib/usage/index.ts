export async function userIsActive(prisma: any, userId: string): Promise<boolean> {
	// Active-like statuses
	const activeStatuses = ["active", "trialing", "paused"];
	const sub = await prisma.subscription.findFirst({
		where: { user_id: userId },
		orderBy: { updated_at: "desc" },
		select: { status: true },
	});
	const status = (sub?.status || "").toLowerCase();
	return activeStatuses.includes(status);
}
