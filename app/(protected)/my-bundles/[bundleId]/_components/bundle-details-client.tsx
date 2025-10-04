"use client";

import { Check, Copy, Edit2, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface BundleEpisode {
	episode_id: string;
	display_order: number;
	is_active: boolean;
	userEpisode: {
		episode_id: string;
		episode_title: string;
		duration_seconds: number | null;
		created_at: Date;
	};
}

interface Bundle {
	shared_bundle_id: string;
	name: string;
	description: string | null;
	is_active: boolean;
	created_at: Date;
	episodes: BundleEpisode[];
}

interface BundleDetailsClientProps {
	bundle: Bundle;
}

export function BundleDetailsClient({ bundle: initialBundle }: BundleDetailsClientProps) {
	const [bundle, setBundle] = useState(initialBundle);
	const [isEditing, setIsEditing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [editedName, setEditedName] = useState(bundle.name);
	const [editedDescription, setEditedDescription] = useState(bundle.description || "");
	const [episodeStates, setEpisodeStates] = useState<Record<string, boolean>>(Object.fromEntries(bundle.episodes.map(ep => [ep.episode_id, ep.is_active])));
	const [copiedLink, setCopiedLink] = useState(false);
	const router = useRouter();

	const handleSave = async () => {
		setIsSaving(true);

		try {
			// Prepare episode updates
			const episodeUpdates = bundle.episodes
				.filter(ep => episodeStates[ep.episode_id] !== ep.is_active)
				.map(ep => ({
					episode_id: ep.episode_id,
					is_active: episodeStates[ep.episode_id],
				}));

			const response = await fetch(`/api/shared-bundles/${bundle.shared_bundle_id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: editedName,
					description: editedDescription,
					episodeUpdates: episodeUpdates.length > 0 ? episodeUpdates : undefined,
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || "Failed to update bundle");
			}

			const updatedBundle = await response.json();
			setBundle(updatedBundle);
			setIsEditing(false);

			toast.success("Your changes have been saved successfully.");

			router.refresh();
		} catch (error) {
			console.error("[SAVE_BUNDLE]", error);
			toast.error(error instanceof Error ? error.message : "Failed to save changes");
		} finally {
			setIsSaving(false);
		}
	};

	const handleCancel = () => {
		setEditedName(bundle.name);
		setEditedDescription(bundle.description || "");
		setEpisodeStates(Object.fromEntries(bundle.episodes.map(ep => [ep.episode_id, ep.is_active])));
		setIsEditing(false);
	};

	const toggleEpisode = (episodeId: string) => {
		setEpisodeStates(prev => ({
			...prev,
			[episodeId]: !prev[episodeId],
		}));
	};

	const copyShareLink = async () => {
		const shareUrl = `${window.location.origin}/shared/${bundle.shared_bundle_id}`;
		try {
			await navigator.clipboard.writeText(shareUrl);
			setCopiedLink(true);
			setTimeout(() => setCopiedLink(false), 2000);
			toast.success("Share link copied to clipboard!");
		} catch (error) {
			console.error("[COPY_LINK]", error);
			toast.error("Failed to copy link");
		}
	};

	const activeEpisodesCount = Object.values(episodeStates).filter(Boolean).length;

	return (
		<div className="flex episode-card-wrapper mt-4 flex-row justify-center min-w-full gap-8">
			<div className=" min-w-[300px] flex flex-col">
				<div className="flex w-full items-center flex-col gap-1 justify-between overflow-hidden rounded-2xl bg-[#047b6ba5] border-2 px-4 py-3 ">
					<div className="flex w-full flex-col items-start justify-start gap-1 rounded-2xl px-4 py-4">		<Badge variant={bundle.is_active ? "default" : "secondary"}>{bundle.is_active ? "Active" : "Inactive"}</Badge>

						<CardTitle className="py-4 flex">Bundle Details</CardTitle>
						<div className="flex gap-4">

							<Button variant="outline" size="sm" onClick={copyShareLink}>
								{copiedLink ? (
									<>
										<Check className="h-4 w-4 mr-1" />
										Copied
									</>
								) : (
									<>
										<Copy className="h-4 w-4 mr-1" />
										Copy Link
									</>
								)}
							</Button>
							{!isEditing ? (
								<Button onClick={() => setIsEditing(true)} size="sm" variant={"default"}>
									<Edit2 className="h-4 w-4 mr-1" />
									Edit Bundle
								</Button>
							) : (
								<>
									<Button variant="outline" onClick={handleCancel} size="sm" disabled={isSaving}>
										<X className="h-4 w-4 mr-1" />
										Cancel
									</Button>
									<Button onClick={handleSave} size="sm" disabled={isSaving} variant={"link"}>
										<Save className="h-4 w-4 mr-1" />
										{isSaving ? "Saving..." : "Save Changes"}
									</Button>
								</>
							)}
						</div>
					</div>

					<div className="w-full rounded-lg">
						<Label htmlFor="bundle-name" className="flex flex-row px-0">
							Bundle Name
						</Label>
						{isEditing ? (
							<Input id="bundle-name" value={editedName} onChange={e => setEditedName(e.target.value)} maxLength={100} className="mt-2" />
						) : (
							<p className="mt-2 text-lg font-medium">{bundle.name}</p>
						)}

						<div className="text-xs">
							{isEditing ? (
								<Textarea id="bundle-description" value={editedDescription} onChange={e => setEditedDescription(e.target.value)} maxLength={500} rows={3} className="mt-2 w-full" />
							) : (
								<p className="mt-2 text-sm text-muted-foreground w-full">{bundle.description || ""}</p>
							)}
							{activeEpisodesCount} / {bundle.episodes.length} episodes active - Created {new Date(bundle.created_at).toLocaleDateString()}
						</div>
					</div>
				</div>

				<CardContent></CardContent>
			</div>

			<div className="rounded-3xl episode-card-wrapper-dark flex-col">
				<CardContent className="p-8 flex flex-col">
					<CardTitle>Episodes</CardTitle>
					{bundle.episodes.length === 0 ? (
						<p className="text-sm text-muted-foreground text-center py-8">No episodes in this bundle yet.</p>
					) : (
						<div className="space-y-3">
							{bundle.episodes.map((episode, index) => (
								<div key={episode.episode_id} className="bg-card flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors">
									<div className="flex items-center gap-4 flex-1">
										<div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">{index + 1}</div>
										<div className="flex flex-col items-start justify-center min-w-0 pr-6  gap-1">
											<h4 className="font-medium max-w-100 text-sm truncate text-cyan-200/80">{episode.userEpisode.episode_title}</h4>
											<p className="text-xs text-muted-foreground">
												{new Date(episode.userEpisode.created_at).toLocaleDateString()} •{" "}
												{episode.userEpisode.duration_seconds ? `${Math.floor(episode.userEpisode.duration_seconds / 60)}m` : "Duration unknown"}
											</p>
										</div>
									</div>
									<div className="flex items-center gap-3">
										<Badge variant={episodeStates[episode.episode_id] ? "default" : "secondary"}>{episodeStates[episode.episode_id] ? "Active" : "Inactive"}</Badge>
										{isEditing && <Switch checked={episodeStates[episode.episode_id]} onCheckedChange={() => toggleEpisode(episode.episode_id)} />}
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</div>
		</div>
	);
}
