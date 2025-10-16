"use client"

import { Link2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Podcast } from "@/lib/types"
import PanelHeader from "./PanelHeader"
import { createPodcastAction, deletePodcastAction, updatePodcastAction } from "./podcasts.actions"

export default function PodcastsPanelClient({ podcasts }: { podcasts: Podcast[] }) {
	const router = useRouter()
	const [optimistic, setOptimistic] = useState<Record<string, Partial<Podcast>>>({})
	const [isPending, startTransition] = useTransition()

	const [createForm, setCreateForm] = useState({
		name: "",
		url: "",
		description: "",
		image_url: "",
		category: "",
	})
	const [showCreateForm, setShowCreateForm] = useState(false)

	const [editOpen, setEditOpen] = useState(false)
	const [editingPodcastId, setEditingPodcastId] = useState<string | null>(null)
	const [editForm, setEditForm] = useState({
		name: "",
		url: "",
		description: "",
		image_url: "",
		category: "",
	})

	const optimisticPodcast = (p: Podcast): Podcast => (({
		...p,
		...(optimistic[p.podcast_id] || {})
	}) as Podcast)

	const doCreate = () => {
		if (!(createForm.name.trim() && createForm.url.trim())) return
		startTransition(async () => {
			try {
				const form = new FormData()
				form.set("name", createForm.name.trim())
				form.set("url", createForm.url.trim())
				if (createForm.description.trim()) form.set("description", createForm.description.trim())
				if (createForm.image_url.trim()) form.set("image_url", createForm.image_url.trim())
				if (createForm.category.trim()) form.set("category", createForm.category.trim())
				await createPodcastAction(form)
				setCreateForm({ name: "", url: "", description: "", image_url: "", category: "" })
				setShowCreateForm(false)
				router.refresh()
			} catch (e) {
				console.error(e)
			}
		})
	}

	const openEdit = (p: Podcast) => {
		setEditingPodcastId(p.podcast_id)
		setEditForm({
			name: p.name || "",
			url: p.url || "",
			description: p.description || "",
			image_url: p.image_url || "",
			category: p.category || "",
		})
		setEditOpen(true)
	}

	const saveEdit = () => {
		if (!editingPodcastId) return
		const id = editingPodcastId
		const prevSnapshot = optimistic[id]
		startTransition(async () => {
			// Optimistically update the item in-place
			setOptimistic(prev => ({
				...prev,
				[id]: {
					...(prev[id] || {}),
					name: editForm.name,
					url: editForm.url,
					description: editForm.description,
					image_url: editForm.image_url,
					category: editForm.category,
				},
			}))
			try {
				await updatePodcastAction(id, {
					...(editForm.name ? { name: editForm.name } : {}),
					...(editForm.description ? { description: editForm.description } : {}),
					...(editForm.url ? { url: editForm.url } : {}),
					...(editForm.image_url !== undefined ? { image_url: editForm.image_url || null } : {}),
					...(editForm.category ? { category: editForm.category } : {}),
				})
				setEditOpen(false)
				router.refresh()
			} catch (e) {
				// Revert on error
				setOptimistic(prev => {
					if (prevSnapshot) return { ...prev, [id]: prevSnapshot }
					const { [id]: _removed, ...rest } = prev
					return rest
				})
				console.error(e)
			}
		})
	}

	const toggleActive = (p: Podcast) => {
		startTransition(async () => {
			setOptimistic(prev => ({ ...prev, [p.podcast_id]: { is_active: !p.is_active } }))
			try {
				await updatePodcastAction(p.podcast_id, { is_active: !p.is_active })
				router.refresh()
			} catch (e) {
				// revert on error
				setOptimistic(prev => ({ ...prev, [p.podcast_id]: { is_active: p.is_active } }))
				console.error(e)
			}
		})
	}

	const deletePodcast = (p: Podcast) => {
		if (!confirm(`Delete podcast "${p.name}"? This cannot be undone.`)) return
		startTransition(async () => {
			try {
				await deletePodcastAction(p.podcast_id)
				setOptimistic(prev => ({ ...prev, [p.podcast_id]: { is_active: false, name: `${p.name} (deleted)` } }))
				router.refresh()
			} catch (e) {
				console.error(e)
			}
		})
	}

	const copyUrl = async (url: string) => {
		try {
			await navigator.clipboard.writeText(url)
			toast.success("Feed URL copied to clipboard")
		} catch {
			toast.error("Failed to copy URL")
		}
	}

	return (
		<Card>
			<PanelHeader
				title={`Podcasts (${podcasts.length})`}
				description="Create, edit, and manage curated podcasts"
				actionButton={{
					label: showCreateForm ? "Hide" : podcasts.length === 0 ? "Add your first podcast" : "Add another podcast",
					onClick: () => setShowCreateForm(s => !s),
				}}
			/>
			<CardContent className="p-4 space-y-6">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Left: create form (toggle) */}
					{showCreateForm && (
						<div className="space-y-3 p-4 border rounded-lg">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<Label htmlFor="podName">Name</Label>
									<Input id="podName" value={createForm.name} onChange={e => setCreateForm(s => ({ ...s, name: e.target.value }))} placeholder="e.g., The Daily" />
								</div>
								<div>
									<Label htmlFor="podUrl">Feed URL</Label>
									<Input id="podUrl" value={createForm.url} onChange={e => setCreateForm(s => ({ ...s, url: e.target.value }))} placeholder="https://example.com/feed.xml" />
								</div>
								<div className="md:col-span-2 my-2 mb-11">
									<Label htmlFor="podDesc">Description</Label>
									<Textarea id="podDesc" rows={2} value={createForm.description} onChange={e => setCreateForm(s => ({ ...s, description: e.target.value }))} />
								</div>
								<div>
									<Label htmlFor="podImg">Image URL</Label>
									<Input id="podImg" value={createForm.image_url} onChange={e => setCreateForm(s => ({ ...s, image_url: e.target.value }))} placeholder="https://.../image.jpg" />
								</div>
								<div>
									<Label htmlFor="podCat">Category</Label>
									<Input id="podCat" value={createForm.category} onChange={e => setCreateForm(s => ({ ...s, category: e.target.value }))} placeholder="e.g., Technology" />
								</div>
							</div>
							<Button variant="default" onClick={doCreate} disabled={isPending || !createForm.name.trim() || !createForm.url.trim()}>
								Create Podcast
							</Button>
						</div>
					)}

					{/* Right: list */}
					<div className="space-y-3">
						{podcasts.map((podcast: Podcast) => {
							const p = optimisticPodcast(podcast)
							return (
								<div key={p.podcast_id} className="p-3 border rounded-lg ">
									{/* Row 1: title */}
									<div className="mb-2">
										<h4 className="font-medium truncate">{p.name}</h4>
									</div>
									{/* Row 2: link icon left, status badge right */}
									<div className="flex items-center justify-between mb-3">
										<Button type="button" variant="ghost" size="sm" onClick={() => copyUrl(p.url)} title="Copy feed URL" aria-label="Copy feed URL">
											<Link2 className="w-4 h-4" />
										</Button>
										<Badge variant={p.is_active ? "default" : "default"}>
											{p.is_active ? "Active" : "Inactive"}
										</Badge>
									</div>
									{/* Row 3: actions */}
									<div className="flex items-center gap-2">
										<Dialog open={editOpen && editingPodcastId === p.podcast_id} onOpenChange={o => !o && setEditOpen(false)}>
											<DialogTrigger asChild>
												<Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
													Edit
												</Button>
											</DialogTrigger>
											<DialogContent>
												<DialogHeader>
													<DialogTitle>Edit podcast</DialogTitle>
												</DialogHeader>
												<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
													<div>
														<Label htmlFor="editName">Name</Label>
														<Input id="editName" value={editForm.name} onChange={e => setEditForm(s => ({ ...s, name: e.target.value }))} />
													</div>
													<div>
														<Label htmlFor="editUrl">Feed URL</Label>
														<Input id="editUrl" value={editForm.url} onChange={e => setEditForm(s => ({ ...s, url: e.target.value }))} />
													</div>
													<div className="">
														<Label htmlFor="editDesc">Description</Label>
														<Textarea id="editDesc" rows={2} value={editForm.description} onChange={e => setEditForm(s => ({ ...s, description: e.target.value }))} />
													</div>
													<div>
														<Label htmlFor="editImg">Image URL</Label>
														<Input id="editImg" value={editForm.image_url} onChange={e => setEditForm(s => ({ ...s, image_url: e.target.value }))} />
													</div>
													<div>
														<Label htmlFor="editCat">Category</Label>
														<Input id="editCat" value={editForm.category} onChange={e => setEditForm(s => ({ ...s, category: e.target.value }))} />
													</div>
												</div>
												<DialogFooter>
													<Button variant="outline" size="md" onClick={() => setEditOpen(false)}>
														Cancel
													</Button>
													<Button variant="default" onClick={saveEdit} disabled={isPending || !editForm.name.trim() || !editForm.url.trim()}>
														Save
													</Button>
												</DialogFooter>
											</DialogContent>
										</Dialog>
										<Button variant="outline" size="sm" onClick={() => toggleActive(p)} disabled={isPending}>
											{p.is_active ? "Deactivate" : "Activate"}
										</Button>
										<Button variant="ghost" size="sm" onClick={() => deletePodcast(p)} disabled={isPending} className="text-destructive">
											Delete
										</Button>
									</div>
								</div>
							)
						})}
						{podcasts.length === 0 && <p className="text-center text-muted-foreground py-4">No podcasts yet.</p>}
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
