import { prisma } from "../lib/prisma";

export async function resetDb() {
	// Fallback to DELETE when lack of TRUNCATE privileges (shared DBs)
	const tables = ["episode_feedback", "episode", "bundle_podcast", "profile_podcast", "user_curation_profile", "bundle", "podcast", "subscription", "notification", "user"];
	for (const t of tables) {
		try {
			await prisma.$executeRawUnsafe(`DELETE FROM "${t}"`);
		} catch (_err) {
			// ignore if table missing or permissions differ; tests create only used rows
		}
	}
}

export async function closeDb() {
	await prisma.$disconnect();
}
