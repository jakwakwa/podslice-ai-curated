"use client";

import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface EpisodeStatusUpdate {
	episodeId: string;
	episodeTitle: string;
	status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
	message: string;
	timestamp: string;
	formattedStartTime?: string;
}

interface EpisodeStatusTableProps {
	/** Whether to show the table expanded by default */
	defaultExpanded?: boolean;
}

/**
 * EpisodeStatusTable Component
 *
 * Displays real-time streaming updates from Inngest episode generation functions.
 * Shows episode generation progress in a collapsible table with user-friendly status messages.
 */
export function EpisodeStatusTable({ defaultExpanded = false }: EpisodeStatusTableProps) {
	const searchParams = useSearchParams();
	const fromGenerate = searchParams?.get("from") === "generate";

	const [_isOpen, setIsOpen] = useState(defaultExpanded || fromGenerate);
	const [episodes, setEpisodes] = useState<Map<string, EpisodeStatusUpdate>>(new Map());
	const [isConnected, setIsConnected] = useState(false);

	useEffect(() => {
		// Create EventSource for SSE
		const eventSource = new EventSource("/api/episode-status/stream");

		eventSource.onopen = () => {
			setIsConnected(true);
		};

		eventSource.onmessage = event => {
			try {
				const data = JSON.parse(event.data);

				// Skip heartbeat messages
				if (data.type === "heartbeat") {
					return;
				}

				// Update episodes map
				setEpisodes(prev => {
					const updated = new Map(prev);
					const existing = updated.get(data.episodeId);

					// Preserve the formatted start time if it already exists
					const formattedStartTime =
						existing?.formattedStartTime || new Date(data.timestamp).toLocaleTimeString();

					updated.set(data.episodeId, {
						...data,
						formattedStartTime,
					});
					return updated;
				});

				// Auto-expand when new episode appears
				setIsOpen(prevIsOpen => {
					if (!prevIsOpen) {
						return true;
					}
					return prevIsOpen;
				});
			} catch (error) {
				console.error("[EPISODE_STATUS_TABLE] Failed to parse update:", error);
			}
		};

		eventSource.onerror = () => {
			setIsConnected(false);
			// Let EventSource auto-reconnect; do not close here
		};

		return () => {
			eventSource.close();
		};
	}, []); // Empty dependency array - connection should persist for component lifetime

	// Filter out completed/failed episodes after a delay
	useEffect(() => {
		const interval = setInterval(() => {
			setEpisodes(prev => {
				const updated = new Map(prev);
				const now = Date.now();

				for (const [id, episode] of updated.entries()) {
					const episodeTime = new Date(episode.timestamp).getTime();
					const isTerminal =
						episode.status === "COMPLETED" || episode.status === "FAILED";

					// Remove completed episodes after 15 seconds (give user time to see success)
					// Remove failed episodes after 30 seconds (give user time to read error)
					const removeAfter = episode.status === "COMPLETED" ? 15000 : 30000;
					if (isTerminal && now - episodeTime > removeAfter) {
						updated.delete(id);
					}
				}

				return updated;
			});
		}, 5000);

		return () => clearInterval(interval);
	}, []);

	const episodeList = Array.from(episodes.values()).sort(
		(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
	);

	// Don't show the component if there are no episodes
	if (episodeList.length === 0) {
		return null;
	}

	return (
		<div className="mx-2 md:mx-0 border-1 outline-1 outline-ring border-border rounded-md md:rounded-xl bg-bigcard px-4 md:p-6">
			<div>
				<div className="flex items-center gap-3 h-20 md:h-12">
					<div
						className={cn(
							"h-2 w-2 rounded-full",
							isConnected ? "bg-green-500 animate-pulse" : "bg-emerald-400 animate pulse"
						)}
					/>
					<h3 className="text-lg font-semibold">Episode Generation Status</h3>
					<Badge variant="status" className="ml-2">
						{episodeList.length > 0} in progress
					</Badge>
				</div>
				<div className="border-t-[#fff]/10 border-t-0 show px-4">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-[25%]">Episode</TableHead>
								<TableHead className="w-[5%]">Status</TableHead>
								<TableHead className="w-[70%]">Progress</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{episodeList.map(episode => (
								<TableRow
									key={episode.episodeId}
									className={cn(
										"transition-all duration-300 w-full",
										episode.status === "COMPLETED" && "bg-green-500/10",
										episode.status === "FAILED" && "bg-red-500/10"
									)}>
									<TableCell className="font-medium ">
										<div className="flex flex-col gap-1">
											<span className="line-clamp-1">{episode.episodeTitle}</span>
											<span className="text-xs text-foreground/50">
												Started {episode.formattedStartTime}
											</span>
										</div>
									</TableCell>
									<TableCell>
										<StatusBadge status={episode.status} />
									</TableCell>
									<TableCell className="text-sm">
										<div className="flex flex-col gap-1 ">
											<span
												className={` line-clamp-2 text-xs  ${cn(
													episode.status === "PROCESSING" && "text-emerald-400 font-medium",
													episode.status === "COMPLETED" && "text-green-400 font-medium",
													episode.status === "FAILED" && "text-red-400",
													episode.status === "PENDING" && "text-muted-foreground "
												)}`}>
												{episode.message}
											</span>
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</div>
		</div>
	);
}

/**
 * StatusBadge Component
 * Displays the current status with appropriate icon and color
 */
function StatusBadge({ status }: { status: EpisodeStatusUpdate["status"] }) {
	switch (status) {
		case "PENDING":
			return (
				<Badge variant="secondary" className="gap-1.5">
					<Clock className="h-3 w-3" />
					Queued
				</Badge>
			);
		case "PROCESSING":
			return (
				<Badge variant="default" className="gap-1.5 bg-emerald-600">
					<Loader2 className="h-3 w-3 animate-spin" />
					Creating
				</Badge>
			);
		case "COMPLETED":
			return (
				<Badge variant="default" className="gap-1.5 bg-green-600">
					<CheckCircle2 className="h-3 w-3" />
					Ready
				</Badge>
			);
		case "FAILED":
			return (
				<Badge variant="destructive" className="gap-1.5">
					<XCircle className="h-3 w-3" />
					Failed
				</Badge>
			);
		default:
			return <Badge variant="secondary">{status}</Badge>;
	}
}
