import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../app/api/episodes/route";
import { prisma } from "../lib/prisma";
import { createBundle, createPodcast, createUser } from "./factories";
import { resetDb } from "./test-db";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn(async () => ({ userId: globalThis.__mockUserId })) }));

declare global {
	// eslint-disable-next-line no-var
	var __mockUserId: string | null | undefined;
}

describe("episodes API derivation", () => {
	beforeEach(async () => {
		await resetDb();
	});

	it("returns episodes by podcasts in selected bundle + own profile episodes", async () => {
		const user = await createUser({ email: "u@test.com" });
		globalThis.__mockUserId = user.user_id;

		const [pA, pB] = await Promise.all([createPodcast(), createPodcast()]);
		const bundle = await createBundle();
		await prisma.bundlePodcast.create({ data: { bundle_id: bundle.bundle_id, podcast_id: pA.podcast_id } });

		const profile = await prisma.userCurationProfile.create({ data: { user_id: user.user_id, name: "Profile" } });
		await prisma.userCurationProfile.update({ where: { profile_id: profile.profile_id }, data: { selected_bundle_id: bundle.bundle_id } });

		const [epA, epB, epMine] = await Promise.all([
			prisma.episode.create({ data: { podcast_id: pA.podcast_id, title: "A", audio_url: "x" } }),
			prisma.episode.create({ data: { podcast_id: pB.podcast_id, title: "B", audio_url: "x" } }),
			prisma.episode.create({ data: { podcast_id: pB.podcast_id, profile_id: profile.profile_id, title: "Mine", audio_url: "x" } }),
		]);

		const res = await GET(new Request("http://test.local"));
		const data = await res.json();
		const ids = (data as Array<{ episode_id: string }>).map(e => e.episode_id);

		expect(ids).toContain(epA.episode_id); // in selected bundle via pA
		expect(ids).not.toContain(epB.episode_id); // not in selected bundle
		expect(ids).toContain(epMine.episode_id); // owned via profile_id
	}, 15000);
});
