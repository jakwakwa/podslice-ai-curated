import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import type { Podcast } from "@/lib/types";
import PodcastsPanelClient from "./PodcastsPanel.client";

export default async function PodcastsPanel() {
	await requireAdmin();
	const podcasts = await prisma.podcast.findMany({ orderBy: { created_at: "desc" } });
	return <PodcastsPanelClient podcasts={podcasts as unknown as Podcast[]} />;
}
