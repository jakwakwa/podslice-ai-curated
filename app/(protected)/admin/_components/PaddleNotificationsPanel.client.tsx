"use client";

import { AlertCircle, Check, Copy, Edit2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface EventType {
	name: string;
	description: string;
	group: string;
	available_versions: number[];
}

interface SubscribedEvent {
	name: string;
	description: string;
	group: string;
	available_versions: number[];
}

interface NotificationSetting {
	id: string;
	description: string;
	type: "url" | "email";
	destination: string;
	active: boolean;
	api_version: number;
	include_sensitive_fields: boolean;
	traffic_source: "all" | "platform" | "simulation";
	subscribed_events: SubscribedEvent[];
}

interface PaddleNotificationsPanelClientProps {
	eventTypes: EventType[];
	notificationSettings: NotificationSetting[];
}

export default function PaddleNotificationsPanelClient({
	eventTypes,
	notificationSettings,
}: PaddleNotificationsPanelClientProps) {
	const router = useRouter();
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [isSecretDialogOpen, setIsSecretDialogOpen] = useState(false);
	const [endpointSecret, setEndpointSecret] = useState<string>("");
	const [copiedSecret, setCopiedSecret] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [editingId, setEditingId] = useState<string | null>(null);

	// Form state
	const [formData, setFormData] = useState({
		description: "",
		type: "url" as "url" | "email",
		destination: "",
		api_version: 1,
		traffic_source: "all" as "all" | "platform" | "simulation",
		subscribed_events: [] as string[],
	});

	// Group event types - Fixed TypeScript issue
	const groupedEvents = eventTypes.reduce(
		(acc, event) => {
			if (!acc[event.group]) {
				acc[event.group] = [];
			}
			const group = acc[event.group];
			if (group) {
				group.push(event);
			}
			return acc;
		},
		{} as Record<string, EventType[]>
	);

	const resetForm = () => {
		setFormData({
			description: "",
			type: "url",
			destination: "",
			api_version: 1,
			traffic_source: "all",
			subscribed_events: [],
		});
		setError(null);
	};

	const handleCreate = async () => {
		setIsSubmitting(true);
		setError(null);

		try {
			const response = await fetch("/api/admin/paddle/notification-settings", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(formData),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to create notification setting");
			}

			const result = await response.json();

			// Show the endpoint secret if present
			if (result.data?.endpoint_secret_key) {
				setEndpointSecret(result.data.endpoint_secret_key);
				setIsSecretDialogOpen(true);
			}

			setIsCreateOpen(false);
			resetForm();
			router.refresh();
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleEdit = async () => {
		if (!editingId) return;

		setIsSubmitting(true);
		setError(null);

		try {
			const updateData = {
				description: formData.description,
				destination: formData.destination,
				traffic_source: formData.traffic_source,
				subscribed_events: formData.subscribed_events,
			};

			const response = await fetch(
				`/api/admin/paddle/notification-settings/${editingId}`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(updateData),
				}
			);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to update notification setting");
			}

			setIsEditOpen(false);
			setEditingId(null);
			resetForm();
			router.refresh();
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async (id: string) => {
		if (
			!confirm(
				"Are you sure you want to delete this notification destination? This action cannot be undone."
			)
		) {
			return;
		}

		try {
			const response = await fetch(`/api/admin/paddle/notification-settings/${id}`, {
				method: "DELETE",
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to delete notification setting");
			}

			router.refresh();
		} catch (err) {
			alert(err instanceof Error ? err.message : "Failed to delete notification setting");
		}
	};

	const openEditDialog = (setting: NotificationSetting) => {
		setEditingId(setting.id);
		setFormData({
			description: setting.description,
			type: setting.type,
			destination: setting.destination,
			api_version: setting.api_version,
			traffic_source: setting.traffic_source,
			subscribed_events: setting.subscribed_events.map(e => e.name),
		});
		setIsEditOpen(true);
	};

	const toggleEvent = (eventName: string) => {
		setFormData(prev => ({
			...prev,
			subscribed_events: prev.subscribed_events.includes(eventName)
				? prev.subscribed_events.filter(e => e !== eventName)
				: [...prev.subscribed_events, eventName],
		}));
	};

	const copySecret = () => {
		navigator.clipboard.writeText(endpointSecret);
		setCopiedSecret(true);
		setTimeout(() => setCopiedSecret(false), 2000);
	};

	const closeSecretDialog = () => {
		setIsSecretDialogOpen(false);
		setEndpointSecret("");
		setCopiedSecret(false);
	};

	return (
		<div className="space-y-6">
			{/* Create Button */}
			<div className="flex justify-end">
				<Button onClick={() => setIsCreateOpen(true)} variant={"link"}>
					<Plus className="w-4 h-4 mr-2" />
					Create Notification Destination
				</Button>
			</div>

			{/* Existing Notification Settings */}
			<Card>
				<CardHeader>
					<CardTitle>Existing Notification Destinations</CardTitle>
					<CardDescription>
						{notificationSettings.length} destination(s) configured
					</CardDescription>
				</CardHeader>
				<CardContent>
					{notificationSettings.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No notification destinations configured yet.
						</p>
					) : (
						<div className="space-y-4">
							{notificationSettings.map(setting => (
								<div key={setting.id} className="p-4 border rounded-lg space-y-2">
									<div className="flex items-start justify-between">
										<div className="flex-1">
											<div className="flex items-center gap-2">
												<h3 className="font-semibold">{setting.description}</h3>
												{setting.active ? (
													<Badge variant="default">Active</Badge>
												) : (
													<Badge variant="secondary">Inactive</Badge>
												)}
												<Badge variant="outline">{setting.type}</Badge>
											</div>
											<p className="text-sm text-muted-foreground mt-1">
												{setting.destination}
											</p>
											<div className="flex items-center gap-2 mt-2">
												<Badge variant="secondary" className="text-xs">
													API v{setting.api_version}
												</Badge>
												<Badge variant="secondary" className="text-xs">
													{setting.traffic_source}
												</Badge>
												<Badge variant="secondary" className="text-xs">
													{setting.subscribed_events.length} events
												</Badge>
											</div>
										</div>
										<div className="flex gap-2">
											<Button
												variant="outline"
												size="sm"
												onClick={() => openEditDialog(setting)}>
												<Edit2 className="w-4 h-4" />
											</Button>
											<Button
												variant="outline"
												size="sm"
												onClick={() => handleDelete(setting.id)}>
												<Trash2 className="w-4 h-4" />
											</Button>
										</div>
									</div>
									<div className="mt-2">
										<p className="text-xs font-medium mb-1">Subscribed Events:</p>
										<div className="flex flex-wrap gap-1">
											{setting.subscribed_events.map(event => (
												<Badge key={event.name} variant="outline" className="text-xs">
													{event.name}
												</Badge>
											))}
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Create Dialog */}
			<Dialog
				open={isCreateOpen}
				onOpenChange={open => {
					setIsCreateOpen(open);
					if (!open) resetForm();
				}}>
				<DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Create Notification Destination</DialogTitle>
						<DialogDescription>
							Configure a new webhook endpoint or email destination to receive Paddle
							events.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4">
						{error && (
							<Alert variant="destructive">
								<AlertCircle className="h-4 w-4" />
								<AlertDescription>{error}</AlertDescription>
							</Alert>
						)}

						<div className="space-y-2">
							<Label htmlFor="description">Description</Label>
							<Input
								id="description"
								placeholder="e.g., Production webhook endpoint"
								value={formData.description}
								onChange={e =>
									setFormData(prev => ({ ...prev, description: e.target.value }))
								}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="type">Type</Label>
							<Select
								value={formData.type}
								onValueChange={(value: "url" | "email") =>
									setFormData(prev => ({ ...prev, type: value }))
								}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="url">URL (Webhook)</SelectItem>
									<SelectItem value="email">Email</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="destination">Destination</Label>
							<Input
								id="destination"
								placeholder={
									formData.type === "url"
										? "https://your-domain.com/webhook"
										: "admin@your-domain.com"
								}
								value={formData.destination}
								onChange={e =>
									setFormData(prev => ({ ...prev, destination: e.target.value }))
								}
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="api_version">API Version</Label>
								<Input
									id="api_version"
									type="number"
									min="1"
									value={formData.api_version}
									onChange={e =>
										setFormData(prev => ({
											...prev,
											api_version: Number.parseInt(e.target.value) || 1,
										}))
									}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="traffic_source">Traffic Source</Label>
								<Select
									value={formData.traffic_source}
									onValueChange={(value: "all" | "platform" | "simulation") =>
										setFormData(prev => ({ ...prev, traffic_source: value }))
									}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All (Platform + Simulation)</SelectItem>
										<SelectItem value="platform">Platform Only</SelectItem>
										<SelectItem value="simulation">Simulation Only</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="space-y-2">
							<Label>
								Subscribed Events ({formData.subscribed_events.length} selected)
							</Label>
							<div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-4">
								{Object.entries(groupedEvents).map(([group, events]) => (
									<div key={group}>
										<h4 className="font-semibold text-sm mb-2">{group}</h4>
										<div className="space-y-2">
											{events.map(event => (
												<div key={event.name} className="flex items-start space-x-2">
													<Checkbox
														id={event.name}
														checked={formData.subscribed_events.includes(event.name)}
														onCheckedChange={() => toggleEvent(event.name)}
													/>
													<div className="flex-1">
														<Label
															htmlFor={event.name}
															className="font-normal cursor-pointer">
															{event.name}
														</Label>
														<p className="text-xs text-muted-foreground">
															{event.description}
														</p>
													</div>
												</div>
											))}
										</div>
									</div>
								))}
							</div>
						</div>
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setIsCreateOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleCreate}
							disabled={
								isSubmitting ||
								!formData.description ||
								!formData.destination ||
								formData.subscribed_events.length === 0
							}
							variant={"default"}>
							{isSubmitting ? "Creating..." : "Create Destination"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Edit Dialog */}
			<Dialog
				open={isEditOpen}
				onOpenChange={open => {
					setIsEditOpen(open);
					if (!open) {
						setEditingId(null);
						resetForm();
					}
				}}>
				<DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Edit Notification Destination</DialogTitle>
						<DialogDescription>
							Update the notification destination settings.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4">
						{error && (
							<Alert variant="destructive">
								<AlertCircle className="h-4 w-4" />
								<AlertDescription>{error}</AlertDescription>
							</Alert>
						)}

						<div className="space-y-2">
							<Label htmlFor="edit-description">Description</Label>
							<Input
								id="edit-description"
								value={formData.description}
								onChange={e =>
									setFormData(prev => ({ ...prev, description: e.target.value }))
								}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="edit-destination">Destination</Label>
							<Input
								id="edit-destination"
								value={formData.destination}
								onChange={e =>
									setFormData(prev => ({ ...prev, destination: e.target.value }))
								}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="edit-traffic_source">Traffic Source</Label>
							<Select
								value={formData.traffic_source}
								onValueChange={(value: "all" | "platform" | "simulation") =>
									setFormData(prev => ({ ...prev, traffic_source: value }))
								}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All (Platform + Simulation)</SelectItem>
									<SelectItem value="platform">Platform Only</SelectItem>
									<SelectItem value="simulation">Simulation Only</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label>
								Subscribed Events ({formData.subscribed_events.length} selected)
							</Label>
							<div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-4">
								{Object.entries(groupedEvents).map(([group, events]) => (
									<div key={group}>
										<h4 className="font-semibold text-sm mb-2">{group}</h4>
										<div className="space-y-2">
											{events.map(event => (
												<div key={event.name} className="flex items-start space-x-2">
													<Checkbox
														id={`edit-${event.name}`}
														checked={formData.subscribed_events.includes(event.name)}
														onCheckedChange={() => toggleEvent(event.name)}
													/>
													<div className="flex-1">
														<Label
															htmlFor={`edit-${event.name}`}
															className="font-normal cursor-pointer">
															{event.name}
														</Label>
														<p className="text-xs text-muted-foreground">
															{event.description}
														</p>
													</div>
												</div>
											))}
										</div>
									</div>
								))}
							</div>
						</div>
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setIsEditOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleEdit}
							disabled={
								isSubmitting ||
								!formData.description ||
								!formData.destination ||
								formData.subscribed_events.length === 0
							}
							variant={"link"}>
							{isSubmitting ? "Updating..." : "Update Destination"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Endpoint Secret Dialog */}
			<Dialog open={isSecretDialogOpen} onOpenChange={closeSecretDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Notification Destination Created</DialogTitle>
						<DialogDescription>
							Save this endpoint secret key. You won't be able to see it again.
						</DialogDescription>
					</DialogHeader>

					<Alert>
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>
							Store this secret securely and use it to verify webhook signatures. Set it
							as{" "}
							<code className="text-xs bg-muted px-1 py-0.5 rounded">
								PADDLE_NOTIFICATION_WEBHOOK_SECRET
							</code>{" "}
							in your environment variables.
						</AlertDescription>
					</Alert>

					<div className="space-y-2">
						<Label>Endpoint Secret Key</Label>
						<div className="flex gap-2">
							<Textarea
								value={endpointSecret}
								readOnly
								className="font-mono text-xs"
								rows={3}
							/>
							<Button
								variant="outline"
								size="icon"
								onClick={copySecret}
								className="shrink-0">
								{copiedSecret ? (
									<Check className="h-4 w-4" />
								) : (
									<Copy className="h-4 w-4" />
								)}
							</Button>
						</div>
					</div>

					<DialogFooter>
						<Button onClick={closeSecretDialog} variant={"link"}>
							I've Saved the Secret
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
