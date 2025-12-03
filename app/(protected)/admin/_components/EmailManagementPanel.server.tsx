import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import type { Bundle, Episode } from "@/lib/types";
import EmailManagementClient from "../_components/EmailManagementClient";

export default async function EmailManagementPanel() {
	await requireAdmin();

	type UserCurationProfileWithUser = Prisma.UserCurationProfileGetPayload<{
		include: {
			user: { select: { user_id: true; email: true; name: true } };
			selectedBundle: true;
		};
	}>;

	type BundleWithPodcasts = Prisma.BundleGetPayload<{
		include: {
			bundle_podcast: {
				include: { podcast: true };
			};
		};
	}>;

	const [bundles, episodes, userProfiles] = await Promise.all([
		prisma.bundle.findMany({
			where: { is_active: true },
			include: { bundle_podcast: { include: { podcast: true } } },
			orderBy: { name: "asc" },
		}),
		prisma.episode.findMany({
			orderBy: { published_at: "desc" },
			take: 50, // Limit to recent episodes
		}),
		prisma.userCurationProfile.findMany({
			where: {
				is_active: true,
				selected_bundle_id: { not: null },
				user: { email_notifications: true },
			},
			include: {
				user: { select: { user_id: true, email: true, name: true } },
				selectedBundle: true,
			},
		}),
	]);

	// Group users by their selected bundle
	const usersByBundle = userProfiles.reduce(
		(
			acc: Record<
				string,
				Array<{ user_id: string; email: string; name: string; profile_name: string }>
			>,
			profile: UserCurationProfileWithUser
		) => {
			const bundleId = profile.selected_bundle_id!;
			if (!acc[bundleId]) {
				acc[bundleId] = [];
			}
			acc[bundleId].push({
				user_id: profile.user.user_id,
				email: profile.user.email,
				name: profile.user.name || "User",
				profile_name: profile.name,
			});
			return acc;
		},
		{} as Record<
			string,
			Array<{ user_id: string; email: string; name: string; profile_name: string }>
		>
	);

	const shapedBundles = bundles.map((b: BundleWithPodcasts) => ({
		...(b as unknown as Bundle),
		podcasts: b.bundle_podcast.map(bp => bp.podcast),
		userCount: usersByBundle[b.bundle_id]?.length || 0,
	}));

	const shapedEpisodes = episodes as unknown as Episode[];

	return (
		<EmailManagementClient
			bundles={shapedBundles}
			episodes={shapedEpisodes}
			usersByBundle={usersByBundle}
		/>
	);
}
