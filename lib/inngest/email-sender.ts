/**
 * Email sender function - runs in Next.js runtime with full access to email dependencies
 * Triggered by events from Inngest workflows running in Inngest runtime
 */

import emailService from "@/lib/email-service";
import { prisma } from "@/lib/prisma";
import { inngest } from "./client";

export const sendEpisodeReadyEmail = inngest.createFunction(
	{
		id: "send-episode-ready-email",
		name: "Send Episode Ready Email",
		retries: 3,
	},
	{ event: "episode.ready.email" },
	async ({ event }) => {
		const { userEpisodeId } = event.data as { userEpisodeId: string };

		const episode = await prisma.userEpisode.findUnique({
			where: { episode_id: userEpisodeId },
			select: { episode_id: true, episode_title: true, user_id: true },
		});

		if (!episode) {
			console.warn(`[EMAIL] Episode ${userEpisodeId} not found`);
			return;
		}

		const [user, profile] = await Promise.all([
			prisma.user.findUnique({
				where: { user_id: episode.user_id },
				select: { email: true, name: true, email_notifications: true },
			}),
			prisma.userCurationProfile.findFirst({
				where: { user_id: episode.user_id, is_active: true },
				select: { name: true },
			}),
		]);

		if (!(user?.email && user.email_notifications)) {
			console.log(
				`[EMAIL] User ${episode.user_id} has email notifications disabled or no email`
			);
			return;
		}

		const userFirstName = (user.name || "").trim().split(" ")[0] || "there";
		const profileName = profile?.name ?? "Your personalized feed";
		const baseUrl =
			process.env.EMAIL_LINK_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "";
		const episodeUrl = `${baseUrl}/my-episodes/${encodeURIComponent(userEpisodeId)}`;

		const success = await emailService.sendEpisodeReadyEmail(
			episode.user_id,
			user.email,
			{
				userFirstName,
				episodeTitle: episode.episode_title,
				episodeUrl,
				profileName,
			}
		);

		if (!success) {
			throw new Error("Failed to send episode ready email");
		}

		console.log(
			`[EMAIL] Successfully sent episode ready email for ${userEpisodeId} to ${user.email}`
		);
		return { success: true, userEpisodeId };
	}
);

export const sendEpisodeFailedEmail = inngest.createFunction(
	{
		id: "send-episode-failed-email",
		name: "Send Episode Failed Email",
		retries: 3,
	},
	{ event: "episode.failed.email" },
	async ({ event }) => {
		const { userEpisodeId } = event.data as { userEpisodeId: string };

		const episode = await prisma.userEpisode.findUnique({
			where: { episode_id: userEpisodeId },
			select: { episode_title: true, user_id: true },
		});

		if (!episode) {
			console.warn(`[EMAIL] Episode ${userEpisodeId} not found`);
			return;
		}

		const user = await prisma.user.findUnique({
			where: { user_id: episode.user_id },
			select: { email: true, name: true, email_notifications: true },
		});

		if (!(user?.email && user.email_notifications)) {
			console.log(
				`[EMAIL] User ${episode.user_id} has email notifications disabled or no email`
			);
			return;
		}

		const userFirstName = (user.name || "").trim().split(" ")[0] || "there";

		const success = await emailService.sendEpisodeFailedEmail(
			episode.user_id,
			user.email,
			{
				userFirstName,
				episodeTitle: episode.episode_title,
			}
		);

		if (!success) {
			throw new Error("Failed to send episode failed email");
		}

		console.log(
			`[EMAIL] Successfully sent episode failed email for ${userEpisodeId} to ${user.email}`
		);
		return { success: true, userEpisodeId };
	}
);
