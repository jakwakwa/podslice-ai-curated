import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../app/api/curated-bundles/route";
import { prisma } from "../lib/prisma";
import { createBundle, createPodcast, createUser } from "./factories";
import { resetDb } from "./test-db";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn(async () => ({ userId: globalThis.__mockUserId })) }));

declare global {
	// eslint-disable-next-line no-var
	var __mockUserId: string | null | undefined;
}

describe("curated bundles API", () => {
	beforeEach(async () => {
		await resetDb();
		globalThis.__mockUserId = null;
	});

	it("sets canInteract=false for higher gate when non-admin, true for admin; returns podcasts list", async () => {
		const [user, admin] = await Promise.all([createUser({ email: "c@test.com" }), createUser({ email: "a@test.com", is_admin: true })]);
		await prisma.subscription.create({ data: { user_id: user.user_id, plan_type: "casual_listener" } });

		const b = await createBundle({ min_plan: "CURATE_CONTROL" });
		const p = await createPodcast();
		await prisma.bundlePodcast.create({ data: { bundle_id: b.bundle_id, podcast_id: p.podcast_id } });

		// non-admin
		globalThis.__mockUserId = user.user_id;
		let res = await GET(new NextRequest("http://test.local"));
		let data = await res.json();
		let item = data.find((x: { bundle_id: string }) => x.bundle_id === b.bundle_id);
		expect(item.canInteract).toBe(false);
		expect(item.podcasts[0].podcast_id).toBe(p.podcast_id);

		// admin (bypass)
		globalThis.__mockUserId = admin.user_id;
		res = await GET(new NextRequest("http://test.local"));
		data = await res.json();
		item = data.find((x: { bundle_id: string }) => x.bundle_id === b.bundle_id);
		expect(item.canInteract).toBe(true);
	});
});
