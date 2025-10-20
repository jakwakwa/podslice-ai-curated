import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Server-Sent Events endpoint for streaming episode status updates
 * Polls the database every 2 seconds and sends updates to the client
 */
export async function GET(request: Request) {
	const { userId } = await auth();
	
	if (!userId) {
		return new NextResponse("Unauthorized", { status: 401 });
	}

	const encoder = new TextEncoder();
	
	const stream = new ReadableStream({
		async start(controller) {
			// Track last seen status to detect changes
			const lastSeenStatus = new Map<string, string>();
			
			// Function to send episode updates
			const sendUpdate = async () => {
				try {
					// Fetch episodes:
					// - All PENDING and PROCESSING episodes (active work)
					// - COMPLETED and FAILED episodes updated in the last 5 minutes (terminal states)
					const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
					
					const episodes = await prisma.userEpisode.findMany({
						where: {
							user_id: userId,
							OR: [
								// Active episodes (always include)
								{
									status: {
										in: ["PENDING", "PROCESSING"]
									}
								},
								// Recently completed/failed episodes (for final status updates)
								{
									status: {
										in: ["COMPLETED", "FAILED"]
									},
									updated_at: {
										gte: fiveMinutesAgo
									}
								}
							]
						},
						select: {
							episode_id: true,
							episode_title: true,
							status: true,
							created_at: true,
							updated_at: true,
						},
						orderBy: { created_at: "desc" },
						take: 10,
					});

					// Check for status changes
					for (const episode of episodes) {
						const lastStatus = lastSeenStatus.get(episode.episode_id);
						if (lastStatus !== episode.status) {
							lastSeenStatus.set(episode.episode_id, episode.status);
							
						// Send update with user-friendly message
						const message = getStatusMessage(episode.status);
						const data = {
							episodeId: episode.episode_id,
							episodeTitle: episode.episode_title,
							status: episode.status,
							message,
							timestamp: new Date().toISOString(),
						};
							
							controller.enqueue(
								encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
							);
						}
					}

					// Send heartbeat if no updates
					if (episodes.length === 0 || lastSeenStatus.size === 0) {
						controller.enqueue(
							encoder.encode(`data: ${JSON.stringify({ type: "heartbeat" })}\n\n`)
						);
					}
				} catch (error) {
					console.error("[EPISODE_STATUS_STREAM]", error);
				}
			};

			// Initial send
			await sendUpdate();

			// Poll every 2 seconds
			const interval = setInterval(sendUpdate, 2000);

			// Cleanup on close
			request.signal.addEventListener("abort", () => {
				clearInterval(interval);
				controller.close();
			});
		},
	});

	return new NextResponse(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			"Connection": "keep-alive",
		},
	});
}

/**
 * Generate user-friendly status messages
 */
function getStatusMessage(status: string): string {
	switch (status) {
		case "PENDING":
			return "Your episode is queued up and ready to start. Hang tight!";
		case "PROCESSING":
			return "We're working on your episode—analyzing content, generating your custom audio, and polishing everything. This might take a few minutes.";
		case "COMPLETED":
			return "All done! Your episode is ready to enjoy. Check it out below.";
		case "FAILED":
			return "Oops! Something went wrong while creating your episode. Don't worry, you can try again or reach out to support if this keeps happening.";
		default:
			return "Getting your episode ready...";
	}
}
