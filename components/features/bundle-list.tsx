"use client";

import { Lock } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Bundle, Podcast } from "@/lib/types";
import { AppSpinner } from "../ui/app-spinner";
import { PageHeader } from "../ui/page-header";

// Type for bundle with podcasts array from API
type BundleWithPodcasts = (Bundle & { podcasts: Podcast[] }) & { canInteract?: boolean; lockReason?: string | null };

interface BundleListProps {
	onBundleSelect: (bundle: BundleWithPodcasts) => void;
	selectedBundleId?: string;
}

export function BundleList({ onBundleSelect }: BundleListProps) {
	const [curatedBundles, setCuratedBundles] = useState<BundleWithPodcasts[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchCuratedBundles = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);

			const response = await fetch("/api/curated-bundles");
			if (!response.ok) {
				throw new Error(`Failed to load PODSLICE Bundles. Server responded with status ${response.status}.`);
			}

			const data = await response.json();
			setCuratedBundles(data);
		} catch (error) {
			console.error("Error fetching PODSLICE Bundles:", error);
			setError(error instanceof Error ? error.message : "An unexpected error occurred while loading PODSLICE Bundles.");
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchCuratedBundles();
	}, [fetchCuratedBundles]);

	if (isLoading) {
		return (
			<div className="wrapper">
				<PageHeader title="PODSLICE Bundles" description="Choose from our pre-curated podcast bundles. Each bundle contains 5 carefully selected shows and cannot be modified once selected." />
				<div className="p-8 max-w-[1200px] mx-auto">
					<div className="flex items-center justify-center min-h-[400px]">
						<AppSpinner size="lg" label="Loading Bundles..." />
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="max-w-2xl mx-auto">
				<p>Unable to Load PODSLICE Bundles: {error}</p>
				<div className="mt-6 text-center">
					<Button onClick={fetchCuratedBundles} variant="outline">
						Try Again
					</Button>
				</div>
			</div>
		);
	}

	if (curatedBundles.length === 0) {
		return (
			<div className="max-w-2xl mx-auto">
				<p>No PODSLICE Bundles Available. Please check back later or contact support if this problem persists.</p>
				<div className="mt-6 text-center">
					<Button onClick={fetchCuratedBundles} variant="outline">
						Refresh
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-2 justify-center items-center w-full max-w-md">
			{curatedBundles.map(bundle => {
				const disabled = bundle.canInteract === false;
				return (
					<Card key={bundle.bundle_id} className={`w-full ${disabled ? "opacity-60" : ""}`} onClick={() => onBundleSelect(bundle)}>
						<CardContent className="p-2">
							<div className="flex flex-col">
								{/* Bundle info section */}
								<div className="flex flex-col w-full min-w-0">
									<div className="flex flex-row w-full min-w-0 rounded-lg gap-1">
										{/* Image on the left - fixed square dimensions */}
										<div className="shrink-0 p-4">
											{bundle.image_url ? (
												<Image src={bundle.image_url} alt={bundle.name} width={80} height={80} className="w-20 h-20 object-cover rounded-lg" />
											) : (
												<div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
													<span className="text-muted-foreground text-xs">No Image</span>
												</div>
											)}
										</div>

										<div className="flex flex-col w-full min-w-0 py-4 items-start">
											{/* Bundle title - truncated */}
											<CardTitle className="text-lg font-semibold mb-2 truncate w-full">{bundle.name}</CardTitle>
											{/* Bundle description - truncated with tooltip */}
											<div className="mb-3">
												<Tooltip>
													<TooltipTrigger asChild>
														<p className="text-sm text-muted-foreground line-clamp-2 leading-tight">{bundle.description}</p>
													</TooltipTrigger>
													<TooltipContent side="top" className="max-w-xs">
														<p>{bundle.description}</p>
													</TooltipContent>
												</Tooltip>
											</div>
										</div>
									</div>
								</div>

								{/* Podcasts section */}
								<div className="flex flex-col rounded-lg w-full min-w-0 bg-background/50 border border-border">
									{/* Podcasts list */}
									<div className="mb-0 p-4">
										<h5 className="font-medium mb-1 text-body">Included Podcasts:</h5>
										<ul className="space-y-1 pt-2">
											{bundle.podcasts?.map(podcast => (
												<li key={podcast.podcast_id} className="text-sm text-muted-foreground truncate">
													{podcast.name}
												</li>
											))}
											{(!bundle.podcasts || bundle.podcasts.length === 0) && <li className="text-sm text-muted-foreground">No podcasts linked yet</li>}
										</ul>
									</div>

									{/* Fixed selection indicator */}
									<div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
										<Lock size={12} />
										<span className="truncate">{disabled ? bundle.lockReason || "Requires higher plan" : "Fixed Selection"}</span>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
}
