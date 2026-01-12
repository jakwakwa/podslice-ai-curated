import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import CommonSectionWithChildren from "@/components/shared/section-common";
import NotificationsClient from "@/components/notifications/notifications-client";
import { notificationsContent } from "./content";

export default async function NotificationsPage() {
	const { userId } = await auth();
	if (!userId) {
		// Protected route should handle auth, but guard just in case
		return null;
	}

	const notifications = await prisma.notification.findMany({
		where: { user_id: userId },
		orderBy: { created_at: "desc" },
	});

	return (
		<CommonSectionWithChildren
			title={notificationsContent.title}
			description={notificationsContent.description}>
			<NotificationsClient
				initialNotifications={notifications}
				content={notificationsContent}
			/>
		</CommonSectionWithChildren>
	);
}
