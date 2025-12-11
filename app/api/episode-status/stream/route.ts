import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Run on Edge to avoid Lambda idle timeouts and enable long-lived streaming
export const runtime = "edge";
export const dynamic = "force-dynamic";
// Upper bound for Edge function; we will rotate connections proactively
export const maxDuration = 300;

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
			// Tell EventSource to retry in 5s on disconnect
			controller.enqueue(encoder.encode(`retry: 5000\n\n`));
			// Track last seen status to detect changes
			const lastSeenStatus = new Map<string, string>();

			// Function to send episode updates
			const sendUpdate = async () => {
				try {
					// Fetch episodes:
					// - All PENDING and PROCESSING episodes (active work)
					// - COMPLETED and FAILED episodes updated in the last 5 minutes (terminal states)
					const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
					const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

					const episodes = await prisma.userEpisode.findMany({
						where: {
							user_id: userId,
							OR: [
								// Active episodes (only include if created within the last hour)
								{
									status: {
										in: ["PENDING", "PROCESSING"],
									},
									created_at: {
										gte: oneHourAgo,
									},
								},
								// Recently completed/failed episodes (for final status updates)
								{
									status: {
										in: ["COMPLETED", "FAILED"],
									},
									updated_at: {
										gte: fiveMinutesAgo,
									},
								},
							],
						},
						select: {
							episode_id: true,
							episode_title: true,
							status: true,
							progress_message: true,
							created_at: true,
							updated_at: true,
						},
						orderBy: { created_at: "desc" },
						take: 10,
					});

					// Check for status changes or progress updates
					for (const episode of episodes) {
						const lastStatus = lastSeenStatus.get(episode.episode_id);
						const hasStatusChanged = lastStatus !== episode.status;

						// Always send update if status changed, or if there's an active progress message
						if (hasStatusChanged || episode.progress_message) {
							lastSeenStatus.set(episode.episode_id, episode.status);

							// Use progress message if available, otherwise use status-based message
							const message =
								episode.progress_message || getStatusMessage(episode.status);
							const data = {
								episodeId: episode.episode_id,
								episodeTitle: episode.episode_title,
								status: episode.status,
								message,
								timestamp: new Date().toISOString(),
							};

							controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
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

			// Heartbeat every 20 seconds to keep the connection alive through proxies
			const heartbeat = setInterval(() => {
				try {
					controller.enqueue(
						encoder.encode(`event: heartbeat\ndata: {"type":"heartbeat"}\n\n`)
					);
				} catch (_e) {
					// no-op
				}
			}, 20000);

			// Proactively close the stream around 55s so the browser reconnects and we avoid platform timeouts
			const plannedClose = setTimeout(() => {
				try {
					controller.enqueue(
						encoder.encode(`event: close\ndata: {"reason":"rotate"}\n\n`)
					);
				} catch (_e) {}
				clearInterval(interval);
				clearInterval(heartbeat);
				controller.close();
			}, 55000);

			// Cleanup on close
			request.signal.addEventListener("abort", () => {
				clearInterval(interval);
				clearInterval(heartbeat);
				clearTimeout(plannedClose);
				controller.close();
			});
		},
	});

	return new NextResponse(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
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
