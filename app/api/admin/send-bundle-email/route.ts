import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { requireAdminMiddleware } from "@/lib/admin-middleware";
import { emailService } from "@/lib/email-service";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
	try {
		// Check admin status
		const adminCheck = await requireAdminMiddleware();
		if (adminCheck) {
			return adminCheck;
		}

		const { userId } = await auth();
		if (!userId) {
			return new NextResponse("Unauthorized", { status: 401 });
		}

		const { bundleId, episodeId, subject, message } = await request.json();

		if (!(bundleId && episodeId && subject && message)) {
			return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
		}

		// Get the episode details
		const episode = await prisma.episode.findUnique({
			where: { episode_id: episodeId },
		});

		if (!episode) {
			return NextResponse.json({ message: "Episode not found" }, { status: 404 });
		}

		// Get users subscribed to this bundle
		const userProfiles = await prisma.userCurationProfile.findMany({
			where: {
				selected_bundle_id: bundleId,
				is_active: true,
				user: { email_notifications: true },
			},
			include: {
				user: { select: { user_id: true, email: true, name: true } },
			},
		});

		if (userProfiles.length === 0) {
			return NextResponse.json(
				{ message: "No users found for this bundle" },
				{ status: 404 }
			);
		}

		// Send emails
		let sentCount = 0;
		const errors: string[] = [];

		for (const profile of userProfiles) {
			try {
				// Hardcode domain URL for dev environment
				const baseUrl =
					process.env.NODE_ENV === "development"
						? "https://podslice-ai-synthesis.vercel.app"
						: process.env.NEXT_PUBLIC_APP_URL;

				const episodeUrl = `${baseUrl}/episodes`;

				const success = await emailService.sendEmail({
					to: profile.user.email,
					subject: subject,
					text: `${message}\n\nEpisode: ${episode.title}\nListen: ${episodeUrl}`,
					html: `
						<!DOCTYPE html>
						<html>
						<head>
							<meta charset="utf-8">
							<meta name="viewport" content="width=device-width, initial-scale=1.0">
							<title>${subject}</title>
						</head>
						<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
							<div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px 20px;">
								<div style="text-align: center; margin-bottom: 32px;">
									<h1 style="color: #222222; font-size: 28px; margin: 0;">${subject}</h1>
								</div>

								<div style="margin-bottom: 32px;">
									<p style="color: #374151; font-size: 16px; line-height: 1.5; white-space: pre-line;">${message}</p>
								</div>

								<div style="background-color: #DAD0FE; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
									<h2 style="color: #361349; font-size: 20px; margin: 0;">${episode.title}</h2>
								</div>

								<div style="text-align: center; margin-bottom: 32px;">
									<a href="${episodeUrl}" style="display: inline-block; background-color: #573BF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">Listen Now</a>
								</div>

								<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

								<div style="text-align: center;">
									<p style="color: #9ca3af; font-size: 12px; margin: 0;">
										The PODSLICE Team
									</p>
								</div>
							</div>
						</body>
						</html>
					`,
				});

				if (success) {
					sentCount++;
				} else {
					errors.push(`Failed to send to ${profile.user.email}`);
				}
			} catch (error) {
				console.error(`Error sending email to ${profile.user.email}:`, error);
				errors.push(`Failed to send to ${profile.user.email}`);
			}
		}

		return NextResponse.json({
			success: true,
			sentCount,
			totalUsers: userProfiles.length,
			errors: errors.length > 0 ? errors : undefined,
		});
	} catch (error) {
		console.error("Error in send-bundle-email:", error);
		return NextResponse.json({ message: "Internal server error" }, { status: 500 });
	}
}
