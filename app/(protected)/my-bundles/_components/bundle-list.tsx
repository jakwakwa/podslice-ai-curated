"use client";

import { Check, Copy, Eye, EyeOff, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface SharedBundle {
	shared_bundle_id: string;
	name: string;
	description: string | null;
	is_active: boolean;
	created_at: string;
	episodes: {
		episode_id: string;
		display_order: number;
		is_active: boolean;
		userEpisode: {
			episode_id: string;
			episode_title: string;
			duration_seconds: number | null;
		};
	}[];
}

export function BundleList() {
	const [bundles, setBundles] = useState<SharedBundle[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [copiedId, setCopiedId] = useState<string | null>(null);

	const fetchBundles = useCallback(async () => {
		try {
			const res = await fetch("/api/shared-bundles");
			if (!res.ok) {
				throw new Error("Failed to fetch bundles.");
			}
			const data = await res.json();
			// Ensure data is an array
			if (Array.isArray(data)) {
				setBundles(data);
			} else {
				console.error("[FETCH_BUNDLES] Expected array, got:", typeof data);
				setBundles([]);
			}
		} catch (err) {
			console.error("[FETCH_BUNDLES]", err);
			setError(err instanceof Error ? err.message : "An unknown error occurred.");
			setBundles([]); // Ensure bundles is always an array
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchBundles();
	}, [fetchBundles]);

	const toggleBundleActive = async (bundleId: string, currentState: boolean) => {
		try {
			const res = await fetch(`/api/shared-bundles/${bundleId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ is_active: !currentState }),
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.error || "Failed to update bundle");
			}

			// Refresh the bundle list
			await fetchBundles();

			toast.success(`Bundle ${!currentState ? "enabled" : "disabled"} successfully.`);
		} catch (error) {
			console.error("[TOGGLE_BUNDLE]", error);
			toast.error(error instanceof Error ? error.message : "Failed to update bundle");
		}
	};

	const deleteBundle = async (bundleId: string) => {
		if (!confirm("Are you sure you want to delete this bundle? This action cannot be undone.")) {
			return;
		}

		try {
			const res = await fetch(`/api/shared-bundles/${bundleId}`, {
				method: "DELETE",
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.error || "Failed to delete bundle");
			}

			// Refresh the bundle list
			await fetchBundles();

			toast.success("Bundle deleted successfully.");
		} catch (error) {
			console.error("[DELETE_BUNDLE]", error);
			toast.error(error instanceof Error ? error.message : "Failed to delete bundle");
		}
	};

	const copyShareLink = async (bundleId: string) => {
		const shareUrl = `${window.location.origin}/shared/${bundleId}`;
		try {
			await navigator.clipboard.writeText(shareUrl);
			setCopiedId(bundleId);
			setTimeout(() => setCopiedId(null), 2000);
			toast.success("Share link copied to clipboard!");
		} catch (error) {
			console.error("[COPY_LINK]", error);
			toast.error("Failed to copy link");
		}
	};

	if (error) {
		return <p className="text-red-500">{error}</p>;
	}

	return (
		<div className="episode-card-wrapper h-full min-h-[61vh]">
			<div>
				{isLoading && (
					<div>
						<div className="episode-card-wrapper-dark space-y-2 flex-col flex w-full">
							<Skeleton className="bg-[#2f4383]/30 h-[120px] w-full animate-pulse" />
							<Skeleton className="bg-[#2f4383]/30 h-[120px] w-full animate-pulse" />
							<Skeleton className="bg-[#2f4383]/30 h-[120px] w-full animate-pulse" />
						</div>
					</div>
				)}
				{!isLoading && (!bundles || bundles.length === 0) ? (
					<div className="text-center py-12">
						<p className="text-muted-foreground mb-4">You haven't created any shared bundles yet.</p>
						<p className="text-sm text-muted-foreground">Create a bundle to share collections of your episodes with others.</p>
					</div>
				) : !isLoading && Array.isArray(bundles) && bundles.length > 0 ? (
					<div className="space-y-4">
						{bundles.map(bundle => {
							const activeEpisodes = bundle.episodes.filter(ep => ep.is_active).length;
							const totalEpisodes = bundle.episodes.length;

							return (
								<Card key={bundle.shared_bundle_id} className="episode-card-wrapper-dark  p-12">
									<div className="flex flex-col items-start p-6 justify-between gap-4">
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2 mb-2">
												<h3 className="text-lg text-teal-300/70 font-semibold truncate">{bundle.name}</h3>
												<Badge variant={bundle.is_active ? "secondary" : "destructive"}>{bundle.is_active ? "Active" : "Inactive"}</Badge>
											</div>
											{bundle.description && <p className="text-sm text-muted-foreground mb-3">{bundle.description}</p>}
											<div className="flex items-center gap-4 text-sm text-muted-foreground">
												<span className="text-xs">
													{activeEpisodes} / {totalEpisodes} episodes active
												</span>
												<span className="text-xs">Created {new Date(bundle.created_at).toLocaleDateString()}</span>
											</div>
										</div>
										<div className="mx-auto w-full flex flex-row flex-wrap lg:flex-row items-end gap-2">
											<Button variant="outline" size="xs" onClick={() => copyShareLink(bundle.shared_bundle_id)}>
												{copiedId === bundle.shared_bundle_id ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
												{copiedId === bundle.shared_bundle_id ? "Copied" : "Copy Link"}
											</Button>
											<Button variant="outline" size="sm" onClick={() => toggleBundleActive(bundle.shared_bundle_id, bundle.is_active)}>
												{bundle.is_active ? (
													<>
														<EyeOff className="h-4 w-4 mr-1" />
														Disable
													</>
												) : (
													<>
														<Eye className="h-4 w-4 mr-1" />
														Enable
													</>
												)}
											</Button>
											<Link href={`/my-bundles/${bundle.shared_bundle_id}`}>
												<Button variant="outline" size="sm">
													Manage
												</Button>
											</Link>
											<Button variant="destructive" size="sm" onClick={() => deleteBundle(bundle.shared_bundle_id)}>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									</div>
								</Card>
							);
						})}
					</div>
				) : null}
			</div>
		</div>
	);
}
