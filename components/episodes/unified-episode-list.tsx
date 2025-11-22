"use client";

import { Music } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { PlayableEpisodeCard } from "@/components/episodes/playable-episode-card";
import { EpisodesListSkeleton } from "@/components/shared/skeletons/episodes-skeleton";
import { CardContent } from "@/components/ui/card";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";
import { normalizeEpisode } from "@/lib/episodes/normalize";
import type { Episode, UserEpisode } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface UnifiedEpisodeListProps {
	/** List of episodes to render */
	episodes: (Episode | UserEpisode)[];
	/** Optional override for play handler */
	onPlayEpisode?: (episode: Episode | UserEpisode) => void;
	/** Currently playing episode ID */
	playingEpisodeId?: string | null;
	/** Selected episode ID for highlighting */
	selectedId?: string | null;
	/** Show download button for episodes */
	showDownload?: boolean;
	/** Custom empty state component */
	emptyState?: React.ReactNode;
	/** Layout mode */
	layout?: "list" | "grid";
	/** Additional actions to render for each episode */
	renderActions?: (episode: Episode | UserEpisode) => React.ReactNode;
	/** Filter to apply to episodes (e.g., completedOnly for user episodes) */
	filterCompleted?: boolean;
	/** Auto-scroll to selected episode on mount */
	autoScrollToSelected?: boolean;
	/** Pagination configuration */
	pagination?: {
		currentPage: number;
		totalPages: number;
		onPageChange: (page: number) => void;
	};
	/** Loading state */
	isLoading?: boolean;
	/** Header content (filters, tabs, etc.) */
	header?: React.ReactNode;
	/** Additional className */
	className?: string;
}

/**
 * Unified Episode List Component
 *
 * A single, consolidated component for rendering lists of episodes.
 * Handles both bundle episodes and user-generated summaries consistently.
 *
 * Features:
 * - Works with Episode and UserEpisode types
 * - Consistent PlayableEpisodeCard rendering
 * - Optional download support
 * - Highlighting and selection
 * - Auto-scroll to selected episode
 * - Customizable empty state
 * - List or grid layout
 * - Pagination support
 * - Loading state with skeleton
 * - Header slot
 */
export function UnifiedEpisodeList({
	episodes,
	onPlayEpisode,
	playingEpisodeId,
	selectedId,
	showDownload = false,
	emptyState,
	layout = "list",
	renderActions,
	filterCompleted = false,
	autoScrollToSelected = false,
	pagination,
	isLoading = false,
	header,
	className,
}: UnifiedEpisodeListProps) {
	const [shouldScroll, setShouldScroll] = useState(autoScrollToSelected);

	// Filter episodes if needed (though usually this should be done by parent)
	const filteredEpisodes =
		filterCompleted && !isLoading
			? episodes.filter(ep => {
				// Check if it's a UserEpisode with COMPLETED status
				if ("status" in ep && "signedAudioUrl" in ep) {
					return ep.status === "COMPLETED" && !!ep.signedAudioUrl;
				}
				return true;
			})
			: episodes;

	// Auto-scroll to selected episode
	useEffect(() => {
		if (shouldScroll && selectedId && !isLoading) {
			// Small timeout to ensure rendering is complete
			const timer = setTimeout(() => {
				const element = document.getElementById(`episode-${selectedId}`);
				if (element) {
					element.scrollIntoView({ behavior: "smooth", block: "center" });
					setShouldScroll(false);
				}
			}, 100);
			return () => clearTimeout(timer);
		}
	}, [selectedId, shouldScroll, isLoading]);

	// Render pagination items
	const renderPagination = () => {
		if (!pagination || pagination.totalPages <= 1) return null;

		const { currentPage, totalPages, onPageChange } = pagination;
		const items = [];

		// Previous button
		items.push(
			<PaginationItem key="prev">
				<PaginationPrevious
					href="#"
					onClick={e => {
						e.preventDefault();
						if (currentPage > 1) onPageChange(currentPage - 1);
					}}
					className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
				/>
			</PaginationItem>
		);

		// Page numbers
		// Simple logic: show all if small, otherwise show range around current
		const maxVisiblePages = 5;
		let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
		const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

		if (endPage - startPage + 1 < maxVisiblePages) {
			startPage = Math.max(1, endPage - maxVisiblePages + 1);
		}

		if (startPage > 1) {
			items.push(
				<PaginationItem key="1">
					<PaginationLink
						href="#"
						onClick={e => {
							e.preventDefault();
							onPageChange(1);
						}}>
						1
					</PaginationLink>
				</PaginationItem>
			);
			if (startPage > 2) {
				items.push(
					<PaginationItem key="dots-start">
						<PaginationEllipsis />
					</PaginationItem>
				);
			}
		}

		for (let page = startPage; page <= endPage; page++) {
			items.push(
				<PaginationItem key={page}>
					<PaginationLink
						href="#"
						isActive={page === currentPage}
						onClick={e => {
							e.preventDefault();
							onPageChange(page);
						}}>
						{page}
					</PaginationLink>
				</PaginationItem>
			);
		}

		if (endPage < totalPages) {
			if (endPage < totalPages - 1) {
				items.push(
					<PaginationItem key="dots-end">
						<PaginationEllipsis />
					</PaginationItem>
				);
			}
			items.push(
				<PaginationItem key={totalPages}>
					<PaginationLink
						href="#"
						onClick={e => {
							e.preventDefault();
							onPageChange(totalPages);
						}}>
						{totalPages}
					</PaginationLink>
				</PaginationItem>
			);
		}

		// Next button
		items.push(
			<PaginationItem key="next">
				<PaginationNext
					href="#"
					onClick={e => {
						e.preventDefault();
						if (currentPage < totalPages) onPageChange(currentPage + 1);
					}}
					className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
				/>
			</PaginationItem>
		);

		return (
			<div className="mt-6 mb-4 flex justify-center w-full">
				<Pagination>
					<PaginationContent>{items}</PaginationContent>
				</Pagination>
			</div>
		);
	};

	const layoutClasses =
		layout === "grid"
			? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
			: "w-full inline-flex flex-col gap-1";

	return (
		<div className={cn("border-[#ffffff0e] relative flex flex-col", className)}>
			<div className="top-shadow"></div>
			<div className="relative transition-all duration-200 text-card-foreground rounded-xl p-0 md:min-h-[420px] w-full h-fit">
				{header && <div className="mb-6">{header}</div>}

				<CardContent className="p-0">
					{isLoading ? (
						<EpisodesListSkeleton count={5} />
					) : filteredEpisodes.length === 0 ? (
						emptyState || (
							<div className="text-center py-8 bg-[#18141eb5] text-muted-foreground rounded-lg">
								<Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
								<p>No episodes available</p>
							</div>
						)
					) : (
						<ul className={layoutClasses}>
							{filteredEpisodes.map(episode => {
								const normalized = normalizeEpisode(episode);
								const isSelected = selectedId === normalized.id;
								const isPlaying = playingEpisodeId === normalized.id;

								return (
									<PlayableEpisodeCard
										key={normalized.id}
										episode={episode}
										as="li"
										onPlay={onPlayEpisode}
										showDownload={showDownload}
										selected={isSelected}
										isPlaying={isPlaying}
										renderActions={renderActions}
										className={isSelected ? "ring-2 ring-accent" : ""}
									/>
								);
							})}
						</ul>
					)}
				</CardContent>
			</div>

			{/* Pagination below the list */}
			{!isLoading && filteredEpisodes.length > 0 && renderPagination()}
		</div>
	);
}
