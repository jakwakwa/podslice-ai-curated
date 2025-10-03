"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Bundle, Episode } from "@/lib/types";

type BundleWithUserCount = Bundle & {
	podcasts: Array<{ podcast_id: string; name: string }>;
	userCount: number;
};

type EmailFormData = {
	bundleId: string;
	episodeId: string;
	subject: string;
	message: string;
};

export default function EmailManagementClient({
	bundles,
	episodes,
	usersByBundle,
}: {
	bundles: BundleWithUserCount[];
	episodes: Episode[];
	usersByBundle: Record<string, Array<{ user_id: string; email: string; name: string; profile_name: string }>>;
}) {
	const [isOpen, setIsOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const [formData, setFormData] = useState<EmailFormData>({
		bundleId: "",
		episodeId: "",
		subject: "",
		message: "",
	});

	const selectedBundle = bundles.find(b => b.bundle_id === formData.bundleId);
	const selectedEpisode = episodes.find(e => e.episode_id === formData.episodeId);
	const recipientCount = selectedBundle ? usersByBundle[selectedBundle.bundle_id]?.length || 0 : 0;

	const handleSendEmail = async () => {
		if (!(formData.bundleId && formData.episodeId && formData.subject.trim() && formData.message.trim())) {
			toast.error("Please fill in all fields");
			return;
		}

		startTransition(async () => {
			try {
				const response = await fetch("/api/admin/send-bundle-email", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(formData),
				});

				const result = await response.json();

				if (!response.ok) {
					throw new Error(result.message || "Failed to send emails");
				}

				toast.success(`Successfully sent ${result.sentCount} emails`);
				setIsOpen(false);
				setFormData({ bundleId: "", episodeId: "", subject: "", message: "" });
			} catch (error) {
				console.error("Error sending emails:", error);
				toast.error(error instanceof Error ? error.message : "Failed to send emails");
			}
		});
	};

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Bundle Email Management</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
						{bundles.map(bundle => (
							<div key={bundle.bundle_id} className="p-4 border rounded-lg">
								<h3 className="font-semibold">{bundle.name}</h3>
								<p className="text-sm text-muted-foreground mb-2">{bundle.description}</p>
								<div className="flex flex-wrap gap-1 mb-2">
									{bundle.podcasts.map(podcast => (
										<Badge key={podcast.podcast_id} variant="outline" className="text-xs">
											{podcast.name}
										</Badge>
									))}
								</div>
								<p className="text-sm font-medium text-blue-600">
									{bundle.userCount} user{bundle.userCount !== 1 ? "s" : ""} subscribed
								</p>
							</div>
						))}
					</div>

					<Dialog open={isOpen} onOpenChange={setIsOpen}>
						<DialogTrigger asChild>
							<Button variant={"default"}>Send Email to Bundle Users</Button>
						</DialogTrigger>
						<DialogContent className="max-w-2xl">
							<DialogHeader>
								<DialogTitle>Send Email to Bundle Users</DialogTitle>
							</DialogHeader>

							<div className="space-y-4">
								<div>
									<Select value={formData.bundleId} onValueChange={value => setFormData(prev => ({ ...prev, bundleId: value, episodeId: "" }))}>
										<SelectTrigger>
											<SelectValue placeholder="Choose a bundle" />
										</SelectTrigger>
										<SelectContent>
											{bundles.map(bundle => (
												<SelectItem key={bundle.bundle_id} value={bundle.bundle_id}>
													{bundle.name} ({bundle.userCount} users)
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								{selectedBundle && (
									<div>
										<Label htmlFor="episode">Select Episode</Label>
										<Select value={formData.episodeId} onValueChange={value => setFormData(prev => ({ ...prev, episodeId: value }))}>
											<SelectTrigger>
												<SelectValue placeholder="Choose an episode" />
											</SelectTrigger>
											<SelectContent>
												{episodes.map(episode => (
													<SelectItem key={episode.episode_id} value={episode.episode_id}>
														{episode.title}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								)}

								{selectedEpisode && (
									<div className="p-3 bg-muted rounded-lg">
										<h4 className="font-medium">Selected Episode:</h4>
										<p className="text-sm text-muted-foreground">{selectedEpisode.title}</p>
									</div>
								)}

								<div>
									<Label htmlFor="subject">Subject</Label>
									<Input id="subject" value={formData.subject} onChange={e => setFormData(prev => ({ ...prev, subject: e.target.value }))} placeholder="Email subject" />
								</div>

								<div>
									<Label htmlFor="message">Message</Label>
									<Textarea id="message" value={formData.message} onChange={e => setFormData(prev => ({ ...prev, message: e.target.value }))} placeholder="Your email message..." rows={6} />
								</div>

								{recipientCount > 0 && (
									<div className="p-3 bg-blue-50 rounded-lg">
										<p className="text-sm font-medium text-blue-800">
											This email will be sent to {recipientCount} user{recipientCount !== 1 ? "s" : ""} subscribed to "{selectedBundle?.name}"
										</p>
									</div>
								)}

								<div className="flex justify-end space-x-2">
									<Button variant="outline" onClick={() => setIsOpen(false)}>
										Cancel
									</Button>
									<Button variant="default" onClick={handleSendEmail} disabled={isPending || !formData.bundleId || !formData.episodeId || !formData.subject.trim() || !formData.message.trim()}>
										{isPending ? "Sending..." : `Send to ${recipientCount} Users`}
									</Button>
								</div>
							</div>
						</DialogContent>
					</Dialog>
				</CardContent>
			</Card>
		</div>
	);
}
