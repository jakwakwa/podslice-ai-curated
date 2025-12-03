import { prisma } from "../lib/prisma";

export async function createUser(
	overrides: Partial<Parameters<typeof prisma.user.create>[0]["data"]> = {}
) {
	return prisma.user.create({
		data: {
			email:
				overrides.email ??
				`u_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
			password: overrides.password ?? "x",
			name: overrides.name ?? null,
			image: overrides.image ?? null,
			is_admin: overrides.is_admin ?? false,
			...overrides,
		},
	});
}

export async function createPodcast(
	overrides: Partial<Parameters<typeof prisma.podcast.create>[0]["data"]> = {}
) {
	return prisma.podcast.create({
		data: {
			podcast_id:
				overrides.podcast_id ??
				`podcast_${Date.now()}_${Math.random().toString(36).slice(2)}`,
			name: overrides.name ?? `Podcast ${Date.now()}`,
			url: overrides.url ?? `https://youtu.be/${Math.random().toString(36).slice(2, 13)}`,
			description: overrides.description ?? null,
			image_url: overrides.image_url ?? null,
			category: overrides.category ?? null,
			is_active: overrides.is_active ?? true,
			owner_user_id: overrides.owner_user_id ?? null,
			...overrides,
		},
	});
}

export async function createBundle(
	overrides: Partial<Parameters<typeof prisma.bundle.create>[0]["data"]> = {}
) {
	return prisma.bundle.create({
		data: {
			bundle_id:
				overrides.bundle_id ??
				`bundle_${Date.now()}_${Math.random().toString(36).slice(2)}`,
			name: overrides.name ?? `Bundle ${Date.now()}`,
			description: overrides.description ?? null,
			image_url: overrides.image_url ?? null,
			is_static: overrides.is_static ?? true,
			is_active: overrides.is_active ?? true,
			min_plan: overrides.min_plan ?? "NONE",
			owner_user_id: overrides.owner_user_id ?? null,
			...overrides,
		},
	});
}
