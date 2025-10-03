"use server";

import { auth } from "@clerk/nextjs/server";
import { PlanGate } from "@prisma/client";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

function toArray(value: FormDataEntryValue | FormDataEntryValue[] | null): string[] {
	if (!value) return [];
	if (Array.isArray(value)) return value.map(String);
	// Comma-delimited support if provided
	const str = String(value);
	if (str.includes(","))
		return str
			.split(",")
			.map(s => s.trim())
			.filter(Boolean);
	return [str];
}

function parseMinPlan(input: unknown): PlanGate | undefined {
	if (typeof input !== "string") return undefined;
	const normalized = input.trim().toUpperCase();
	const all = Object.keys(PlanGate) as (keyof typeof PlanGate)[];
	if (all.includes(normalized as keyof typeof PlanGate)) {
		return PlanGate[normalized as keyof typeof PlanGate];
	}
	return undefined;
}

export async function createBundleAction(formData: FormData) {
	await requireAdmin();
	const { userId } = await auth();
	if (!userId) throw new Error("Unauthorized");

	const name = String(formData.get("name") ?? "").trim();
	const description = String(formData.get("description") ?? "").trim();
	const imageUrl = String(formData.get("image_url") ?? "").trim() || null;
	const minPlan = parseMinPlan(formData.get("min_plan"));

	// Accept both shapes: podcast_ids[] or selectedPodcastIds[]
	const podcastIds = [...toArray(formData.getAll("podcast_ids")), ...toArray(formData.getAll("selectedPodcastIds"))];

	if (!name) throw new Error("Bundle name is required");
	if (!description) throw new Error("Bundle description is required");
	// Do NOT require podcasts; bundles can be created empty and linked later

	const created = await prisma.bundle.create({
		data: {
			// Let database default generate bundle_id (uuid)
			name,
			description,
			image_url: imageUrl,
			is_static: true,
			is_active: true,
			owner_user_id: null, // Admin-created bundles are global; avoid FK dependency on local user row
			...(minPlan ? { min_plan: minPlan } : {}),
		},
	});

	if (podcastIds.length > 0) {
		await prisma.bundlePodcast.createMany({
			data: podcastIds.map(pid => ({ bundle_id: created.bundle_id, podcast_id: pid })),
			skipDuplicates: true,
		});
	}

	const bundle = await prisma.bundle.findUnique({
		where: { bundle_id: created.bundle_id },
		include: { bundle_podcast: { include: { podcast: true } }, episodes: { orderBy: { published_at: "desc" } } },
	});

	return { success: true, bundle };
}

export async function updateBundleVisibilityAction(bundleId: string, minPlanInput: string) {
	await requireAdmin();
	if (!bundleId) throw new Error("Bundle ID is required");
	const minPlan = parseMinPlan(minPlanInput);
	if (!minPlan) throw new Error("Invalid min_plan value");

	const updated = await prisma.bundle.update({ where: { bundle_id: bundleId }, data: { min_plan: minPlan } });
	return { success: true, bundle: updated };
}

export async function replaceBundleMembershipAction(bundleId: string, podcastIds: string[]) {
	await requireAdmin();
	if (!bundleId) throw new Error("Bundle ID is required");

	const existing = await prisma.bundle.findUnique({ where: { bundle_id: bundleId } });
	if (!existing) throw new Error("Bundle not found");

	await prisma.$transaction([
		prisma.bundlePodcast.deleteMany({ where: { bundle_id: bundleId } }),
		...(podcastIds.length > 0
			? [
					prisma.bundlePodcast.createMany({
						data: podcastIds.map(pid => ({ bundle_id: bundleId, podcast_id: pid })),
					}),
				]
			: []),
	]);

	const updated = await prisma.bundle.findUnique({
		where: { bundle_id: bundleId },
		include: { bundle_podcast: { include: { podcast: true } }, episodes: { orderBy: { published_at: "desc" } } },
	});

	return { success: true, bundle: updated };
}

export async function updateBundleAction(bundleId: string, data: { name?: string; description?: string; min_plan?: string; podcastIds?: string[] }) {
	await requireAdmin();
	if (!bundleId) throw new Error("Bundle ID is required");

	const { name, description, min_plan, podcastIds } = data;

	const updateData: Record<string, unknown> = {};
	if (name !== undefined) updateData.name = name.trim();
	if (description !== undefined) updateData.description = description.trim();
	if (min_plan !== undefined) {
		const parsed = parseMinPlan(min_plan);
		if (!parsed) throw new Error("Invalid min_plan value");
		updateData.min_plan = parsed;
	}

	// Perform the bundle update if there is any field to change
	if (Object.keys(updateData).length > 0) {
		await prisma.bundle.update({ where: { bundle_id: bundleId }, data: updateData });
	}

	// Handle membership replacement if podcastIds were provided
	if (podcastIds !== undefined) {
		await replaceBundleMembershipAction(bundleId, podcastIds);
	}

	const refreshed = await prisma.bundle.findUnique({
		where: { bundle_id: bundleId },
		include: { bundle_podcast: { include: { podcast: true } }, episodes: { orderBy: { published_at: "desc" } } },
	});

	return { success: true, bundle: refreshed };
}

export async function deleteBundleAction(bundleId: string) {
	await requireAdmin();
	if (!bundleId) throw new Error("Bundle ID is required");

	const bundle = await prisma.bundle.findUnique({
		where: { bundle_id: bundleId },
		include: { user_curation_profile: { where: { is_active: true } } },
	});
	if (!bundle) throw new Error("Bundle not found");
	if (bundle.user_curation_profile.length > 0) {
		throw new Error("Cannot delete bundle; it is used by active user profiles");
	}

	await prisma.bundlePodcast.deleteMany({ where: { bundle_id: bundleId } });
	await prisma.episode.deleteMany({ where: { bundle_id: bundleId } });
	await prisma.bundle.delete({ where: { bundle_id: bundleId } });

	return { success: true };
}
