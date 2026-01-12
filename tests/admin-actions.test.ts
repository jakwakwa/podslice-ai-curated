import { beforeEach, describe, expect, it } from "vitest";
import {
	createBundleAction,
	updateBundleVisibilityAction,
} from "../app/(protected)/admin/_components/bundles.actions";
import {
	createPodcastAction,
	deletePodcastAction,
	updatePodcastAction,
} from "../app/(protected)/admin/_components/podcasts.actions";
import { prisma } from "../lib/prisma";
import { createPodcast, createUser } from "./factories";
import { resetDb } from "./test-db";

declare global {
	// eslint-disable-next-line no-var
	var __mockUserId: string | null | undefined;
}

describe("admin server actions", () => {
	beforeEach(async () => {
		await resetDb();
		globalThis.__mockUserId = "admin-user";
		await createUser({ user_id: "admin-user", email: "admin@test.com", is_admin: true });
	});

	describe("bundles.actions", () => {
		it("creates a bundle with membership via createBundleAction and updates visibility", async () => {
			const p = await createPodcast();

			const form = new FormData();
			form.set("name", "Test Bundle");
			form.set("description", "A test bundle");
			form.set("min_plan", "NONE");
			form.append("podcast_ids", p.podcast_id);

			const res = await createBundleAction(form);
			expect(res.success).toBe(true);
			expect(res.bundle).toBeTruthy();
			const bundleId = res.bundle!.bundle_id;
			expect(bundleId).toBeTruthy();
			expect(res.bundle!.bundle_podcast?.length ?? 0).toBe(1);
			// Ensure membership includes the podcast
			const bp = res.bundle!.bundle_podcast![0];
			expect(bp.podcast.podcast_id).toBe(p.podcast_id);

			// Update visibility to CURATE_CONTROL
			const upd = await updateBundleVisibilityAction(bundleId, "CURATE_CONTROL");
			expect(upd.success).toBe(true);
			expect(upd.bundle.min_plan).toBe("CURATE_CONTROL");
		});
	});

	describe("podcasts.actions", () => {
		it("creates a podcast via createPodcastAction, toggles active, then deletes it", async () => {
			const form = new FormData();
			form.set("name", "Action Podcast");
			form.set("url", `https://example.com/feed/${Date.now()}.xml`);
			form.set("description", "desc");

			const created = await createPodcastAction(form);
			expect(created.success).toBe(true);
			const id = created.podcast.podcast_id;
			expect(id).toBeTruthy();

			const toggled = await updatePodcastAction(id, { is_active: false });
			expect(toggled.is_active).toBe(false);

			const del = await deletePodcastAction(id);
			expect(del.success).toBe(true);
			const gone = await prisma.podcast.findUnique({ where: { podcast_id: id } });
			expect(gone).toBeNull();
		});
	});
});
