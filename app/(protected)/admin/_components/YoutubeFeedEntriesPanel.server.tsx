import { prisma } from "@/lib/prisma";
import YoutubeFeedEntriesPanelClient from "./YoutubeFeedEntriesPanel.client";

export default async function YoutubeFeedEntriesPanel() {
	// Fetch latest 100 entries with user relation for context
	const entries = await prisma.youtubeFeedEntry.findMany({
		include: { user: { select: { user_id: true, email: true } } },
		orderBy: { created_at: "desc" },
		take: 100,
	});

	const shaped = entries.map((e) => ({
		id: e.id,
		userId: e.user?.user_id ?? e.user_id,
		userEmail: e.user?.email ?? null,
		videoTitle: e.video_title,
		videoUrl: e.video_url,
		publishedDate: e.published_date ? e.published_date.toISOString() : null,
		fetchedAt: e.created_at.toISOString(),
	}));

	return <YoutubeFeedEntriesPanelClient entries={shaped} />;
}



