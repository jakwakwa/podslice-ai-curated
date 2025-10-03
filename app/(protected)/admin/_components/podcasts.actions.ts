"use server";

import { auth } from "@clerk/nextjs/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function createPodcastAction(formData: FormData) {
	await requireAdmin();
	const { userId } = await auth();
	if (!userId) throw new Error("Unauthorized");

	const name = String(formData.get("name") ?? "").trim();
	const description = String(formData.get("description") ?? "").trim();
	const url = String(formData.get("url") ?? "").trim();
	const imageUrl = String(formData.get("image_url") ?? "").trim() || null;
	const category = String(formData.get("category") ?? "").trim() || null;

	if (!(name && url)) throw new Error("Name and URL are required");

	const podcast = await prisma.podcast.create({
		data: {
			name,
			description,
			url,
			image_url: imageUrl,
			category: category || undefined,
			is_active: true,
			owner_user_id: null,
		},
	});

	return { success: true, podcast };
}

export async function updatePodcastAction(id: string, data: { name?: string; description?: string; url?: string; image_url?: string | null; category?: string | null; is_active?: boolean }) {
	await requireAdmin();
	if (!id) throw new Error("Podcast ID is required");

	// Validate conflicts for name/url if provided
	if (data.name || data.url) {
		const conflict = await prisma.podcast.findFirst({
			where: {
				podcast_id: { not: id },
				OR: [...(data.name ? [{ name: data.name }] : []), ...(data.url ? [{ url: data.url }] : [])],
			},
		});
		if (conflict) throw new Error("Another podcast with this name or URL already exists");
	}

	const updated = await prisma.podcast.update({
		where: { podcast_id: id },
		data: {
			...(data.name ? { name: data.name } : {}),
			...(data.description ? { description: data.description } : {}),
			...(data.url ? { url: data.url } : {}),
			...(data.image_url !== undefined ? { image_url: data.image_url } : {}),
			...(data.category ? { category: data.category } : {}),
			...(data.is_active !== undefined ? { is_active: data.is_active } : {}),
		},
	});

	return updated;
}

export async function deletePodcastAction(podcastId: string) {
	await requireAdmin();
	if (!podcastId) throw new Error("Podcast ID is required");

	const podcast = await prisma.podcast.findUnique({
		where: { podcast_id: podcastId },
		include: { bundle_podcast: { include: { bundle: { include: { user_curation_profile: { where: { is_active: true } } } } } } },
	});
	if (!podcast) throw new Error("Podcast not found");

	const activeUsage = podcast.bundle_podcast.some(bp => bp.bundle.user_curation_profile.length > 0);
	if (activeUsage) throw new Error("Cannot delete podcast; it is used by active user profiles. Consider deactivating instead.");

	await prisma.bundlePodcast.deleteMany({ where: { podcast_id: podcastId } });
	await prisma.podcast.delete({ where: { podcast_id: podcastId } });

	return { success: true };
}
