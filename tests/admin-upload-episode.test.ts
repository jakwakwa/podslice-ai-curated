import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as uploadEpisode } from "../app/api/admin/upload-episode/route";
import { prisma } from "../lib/prisma";
import { createBundle, createPodcast } from "./factories";
import { resetDb } from "./test-db";

vi.mock("@clerk/nextjs/server", () => ({
	auth: vi.fn(async () => ({ userId: globalThis.__mockUserId })),
}));
vi.mock("@/lib/admin-middleware", () => ({
	requireAdminMiddleware: vi.fn(async () => undefined),
}));

declare global {
	// eslint-disable-next-line no-var
	var __mockUserId: string | null | undefined;
}

describe("admin upload creates podcast-centric episodes", () => {
	beforeEach(async () => {
		await resetDb();
		globalThis.__mockUserId = "admin-user";
		// Ensure admin user exists so requireAdminMiddleware passes
		await prisma.user.create({
			data: {
				user_id: "admin-user",
				email: "admin@test.com",
				password: "x",
				is_admin: true,
			},
		});
	});

	it("uses bundle’s first podcast when bundleId is provided and does not set bundle_id", async () => {
		const bundle = await createBundle();
		const p1 = await createPodcast();
		await prisma.bundlePodcast.create({
			data: { bundle_id: bundle.bundle_id, podcast_id: p1.podcast_id },
		});

		const fd = new FormData();
		fd.set("bundleId", bundle.bundle_id);
		fd.set("title", "Ep");
		fd.set("audioUrl", "https://cdn/foo.mp3");

		const req = new Request("http://test.local", {
			method: "POST",
			body: fd as unknown as BodyInit,
		});
		const res = await uploadEpisode(req);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.episode.podcast_id).toBe(p1.podcast_id);
		expect(body.episode.bundle_id).toBeNull();
	});

	it("uses explicit podcastId when provided and no bundleId", async () => {
		const p = await createPodcast();
		const fd = new FormData();
		fd.set("title", "Ep2");
		fd.set("podcastId", p.podcast_id);
		fd.set("audioUrl", "https://cdn/bar.mp3");

		const req = new Request("http://test.local", {
			method: "POST",
			body: fd as unknown as BodyInit,
		});
		const res = await uploadEpisode(req);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.episode.podcast_id).toBe(p.podcast_id);
		expect(body.episode.bundle_id).toBeNull();
	});
});
