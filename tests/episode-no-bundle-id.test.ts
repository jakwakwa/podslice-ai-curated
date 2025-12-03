import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../lib/prisma";
import { createPodcast } from "./factories";
import { resetDb } from "./test-db";

describe("episodes are podcast-centric", () => {
	beforeEach(async () => {
		await resetDb();
	});

	it("episode.bundle_id is null for new episodes", async () => {
		const p = await createPodcast();
		const ep = await prisma.episode.create({
			data: { podcast_id: p.podcast_id, title: "T", audio_url: "x" },
		});
		expect(ep.bundle_id).toBeNull();
	});
});
