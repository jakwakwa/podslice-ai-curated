"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePlanGatesStore } from "@/lib/stores/plan-gates-store";
import type { Bundle, Podcast } from "@/lib/types";
import {
    createBundleAction,
    deleteBundleAction,
    updateBundleAction,
} from "./bundles.actions";
import PanelHeader from "./PanelHeader";

// Combine bundle + podcasts for convenience
type BundleWithPodcasts = Bundle & { podcasts: Podcast[] };

type OptimisticBundle = Partial<BundleWithPodcasts>;

type EditFormState = {
    name: string;
    description: string;
    min_plan: string;
    selectedPodcastIds: string[];
};

export default function BundlesPanelClient({
    bundles,
    availablePodcasts,
}: {
    bundles: (BundleWithPodcasts & {
        min_plan?: string;
        canInteract?: boolean;
        lockReason?: string | null;
    })[];
    availablePodcasts: Podcast[];
}) {
    const router = useRouter();
    const {
        options: planGateOptions,
        loaded: planGatesLoaded,
        load: loadPlanGates,
    } = usePlanGatesStore();

    const [optimistic, setOptimistic] = useState<Record<string, OptimisticBundle>>({});
    const [isPending, startTransition] = useTransition();

    // CREATE form state
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [createForm, setCreateForm] = useState({
        name: "",
        description: "",
        min_plan: "NONE",
        selectedPodcastIds: [] as string[],
    });
    const [isCreating, setIsCreating] = useState(false);
    const [_createImageFile, setCreateImageFile] = useState<File | null>(null);
    const [createImagePreview, setCreateImagePreview] = useState<string | null>(null);

    // EDIT form state - now inline instead of modal
    const [editingBundleId, setEditingBundleId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<EditFormState>({
        name: "",
        description: "",
        min_plan: "NONE",
        selectedPodcastIds: [] as string[],
    });
    const [editImageFile, setEditImageFile] = useState<File | null>(null);
    const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
    const [failedBundleImages, setFailedBundleImages] = useState<Set<string>>(new Set());

    useEffect(() => {
        loadPlanGates();
    }, [loadPlanGates]);

    // Handle image loading errors
    const handleImageError = (bundleId: string) => {
        setFailedBundleImages(prev => new Set(prev).add(bundleId));
    };

    // Helpers
    const optimisticBundle = (
        b: BundleWithPodcasts & { min_plan?: string }
    ): BundleWithPodcasts & { min_plan?: string } => ({
        ...b,
        ...(optimistic[b.bundle_id] || {}),
    });

    // CREATE
    const toggleCreatePodcastSelection = (id: string) => {
        setCreateForm(prev => ({
            ...prev,
            selectedPodcastIds: prev.selectedPodcastIds.includes(id)
                ? prev.selectedPodcastIds.filter(x => x !== id)
                : [...prev.selectedPodcastIds, id],
        }));
    };

    // Handle image selection for create form
    const handleCreateImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCreateImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setCreateImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // Handle image selection for edit form
    const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setEditImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // Upload image to database
    const uploadImage = async (
        file: File,
        bundleId?: string
    ): Promise<{ imageData: string; imageType: string; url: string } | null> => {
        try {
            const formData = new FormData();
            formData.append("file", file);
            if (bundleId) {
                formData.append("bundleId", bundleId);
            }

            const response = await fetch("/api/admin/upload-bundle-image", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to upload image");
            }

            const result = await response.json();
            return {
                imageData: result.imageData || result.dataUrl,
                imageType: result.imageType,
                url: result.url || result.dataUrl,
            };
        } catch (error) {
            console.error("Image upload error:", error);
            toast.error("Failed to upload image");
            return null;
        }
    };

    const doCreate = async () => {
        if (!createForm.name.trim()) return;

        try {
            setIsCreating(true);

            const form = new FormData();
            form.set("name", createForm.name.trim());
            form.set("description", createForm.description.trim());
            form.set("min_plan", createForm.min_plan);
            createForm.selectedPodcastIds.forEach(id => form.append("podcast_ids", id));

            await createBundleAction(form);

            // Reset form
            setCreateForm({
                name: "",
                description: "No description",
                min_plan: "NONE",
                selectedPodcastIds: [],
            });
            setCreateImageFile(null);
            setCreateImagePreview(null);
            setShowCreateForm(false);
            router.refresh();
        } catch (e) {
            console.error(e);
            toast.error("Failed to create bundle");
        } finally {
            setIsCreating(false);
        }
    };

    // EDIT - now inline
    const startEdit = (b: BundleWithPodcasts & { min_plan?: string }) => {
        setEditingBundleId(b.bundle_id);
        setEditForm({
            name: b.name || "",
            description: b.description || "",
            min_plan: (b.min_plan as string) || "NONE",
            selectedPodcastIds: b.podcasts.map(p => p.podcast_id),
        });
        setEditImageFile(null);
        setEditImagePreview(null);
    };

    const cancelEdit = () => {
        setEditingBundleId(null);
        setEditForm({
            name: "",
            description: "",
            min_plan: "NONE",
            selectedPodcastIds: [],
        });
        setEditImageFile(null);
        setEditImagePreview(null);
    };

    const toggleEditPodcastSelection = (id: string) => {
        setEditForm(prev => ({
            ...prev,
            selectedPodcastIds: prev.selectedPodcastIds.includes(id)
                ? prev.selectedPodcastIds.filter(x => x !== id)
                : [...prev.selectedPodcastIds, id],
        }));
    };

    const saveEdit = () => {
        if (!editingBundleId) return;
        const id = editingBundleId;
        const prevSnapshot = optimistic[id];
        startTransition(async () => {
            try {
                // Upload new image if selected
                let imageData: string | undefined;
                let imageType: string | undefined;
                let imageUrl = ""; // No longer using image_url from state

                if (editImageFile) {
                    const uploadResult = await uploadImage(editImageFile, id);
                    if (uploadResult) {
                        imageData = uploadResult.imageData;
                        imageType = uploadResult.imageType;
                        imageUrl = uploadResult.url;
                    }
                }

                // Optimistic UI update
                setOptimistic(prev => ({
                    ...prev,
                    [id]: {
                        ...(prev[id] || {}),
                        name: editForm.name,
                        description: editForm.description,
                        podcasts: availablePodcasts.filter(p =>
                            editForm.selectedPodcastIds.includes(p.podcast_id)
                        ),
                    },
                }));

                await updateBundleAction(id, {
                    name: editForm.name,
                    description: editForm.description,
                    ...(imageData && imageType
                        ? { image_data: imageData, image_type: imageType }
                        : {}),
                    min_plan: editForm.min_plan,
                    podcastIds: editForm.selectedPodcastIds,
                });
                setEditingBundleId(null);
                setEditImageFile(null);
                setEditImagePreview(null);
                toast.success("Bundle updated");
                router.refresh();
            } catch (e) {
                console.error(e);
                // Revert on error
                setOptimistic(prev => {
                    if (prevSnapshot) return { ...prev, [id]: prevSnapshot };
                    const { [id]: _removed, ...rest } = prev;
                    return rest;
                });
                toast.error("Failed to update bundle");
            }
        });
    };

    // DELETE
    const deleteBundle = (b: BundleWithPodcasts) => {
        if (!confirm(`Delete bundle "${b.name}"? This cannot be undone.`)) return;
        startTransition(async () => {
            try {
                await deleteBundleAction(b.bundle_id);
                setOptimistic(prev => ({
                    ...prev,
                    [b.bundle_id]: { name: `${b.name} (deleted)` },
                }));
                router.refresh();
            } catch (e) {
                console.error(e);
                toast.error("Failed to delete bundle");
            }
        });
    };

    const createButtonLabel =
        bundles.length === 0 ? "Add your first bundle" : "Add Another Bundle";

    return (
        <Card variant="bundle">
            <PanelHeader
                title="Bundle Management"
                description="Create new bundles and manage existing ones"
                actionButton={{
                    label: showCreateForm ? "Hide" : createButtonLabel,
                    onClick: () => setShowCreateForm(s => !s),
                }}
                secondaryButton={{
                    label: "Refresh",
                    onClick: () => router.refresh(),
                }}
            />
            <CardContent className="flex rounded-2xl flex-col gap-4 p-4 space-y-6">
                {/* CREATE FORM */}
                {showCreateForm && (
                    <div className="space-y-3 p-4 border rounded-lg w-full max-w-[500px]">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="bundleName">Bundle Name</Label>
                                <Input
                                    id="bundleName"
                                    value={createForm.name}
                                    onChange={e => setCreateForm(s => ({ ...s, name: e.target.value }))}
                                    placeholder="e.g., Tech Weekly"
                                />
                            </div>

                            <div>
                                <Label htmlFor="bundleImage">Bundle Image</Label>
                                <Input
                                    id="bundleImage"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleCreateImageChange}
                                />
                                {createImagePreview && (
                                    <div className="mt-2">
                                        <img
                                            src={createImagePreview}
                                            alt="Preview"
                                            className="w-20 h-20 object-cover rounded"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="md:col-span-2 max-h-[180px] overflow-y-auto">
                                <Label htmlFor="bundleDescription">Bundle Description</Label>
                                <Textarea
                                    id="bundleDescription"
                                    className="h-full min-h-[100px] max-h-[100px] overflow-y-auto"
                                    value={createForm.name}
                                    onChange={e =>
                                        setCreateForm(s => ({
                                            ...s,
                                            description: e.target.value,
                                        }))
                                    }
                                    placeholder="e.g., Weekly roundup of the latest tech news"
                                />
                            </div>
                            <div>
                                <Label htmlFor="minPlan">Visibility</Label>
                                <select
                                    id="minPlan"
                                    className="w-full text-sm border rounded h-9 px-2"
                                    value={createForm.min_plan}
                                    onChange={e =>
                                        setCreateForm(s => ({ ...s, min_plan: e.target.value }))
                                    }>
                                    {(planGatesLoaded
                                        ? planGateOptions
                                        : [{ value: "NONE", label: "Free (All users)" }]
                                    ).map(opt => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <Label>Select Podcasts (optional)</Label>
                            <div
                                className="mt-2 border rounded-lg p-3"
                                style={{ maxHeight: "200px", overflowY: "auto" }}>
                                {availablePodcasts.map(p => (
                                    <div key={p.podcast_id} className="flex items-center space-x-2 py-1">
                                        <Checkbox
                                            id={`create-pod-${p.podcast_id}`}
                                            checked={createForm.selectedPodcastIds.includes(p.podcast_id)}
                                            onCheckedChange={() => toggleCreatePodcastSelection(p.podcast_id)}
                                        />
                                        <label
                                            htmlFor={`create-pod-${p.podcast_id}`}
                                            className="text-sm font-medium cursor-pointer">
                                            {p.name}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <Button
                            variant="default"
                            onClick={doCreate}
                            disabled={isCreating || !createForm.name.trim()}>
                            {isCreating ? "Creating..." : "Create Bundle"}
                        </Button>
                    </div>
                )}

                {/* EXISTING BUNDLES LIST */}
                <div className="space-y-4 flex flex-col gap-5">
                    {bundles.map(bundleOriginal => {
                        const bundle = optimisticBundle(bundleOriginal);
                        const isEditing = editingBundleId === bundle.bundle_id;

                        return (
                            <div
                                key={bundle.bundle_id}
                                className={`episode-card-wrapper p-4 border rounded-lg ${bundleOriginal.canInteract === false ? "opacity-60" : ""}`}>
                                {/* Header */}
                                <div className="flex items-start gap-2 justify-between mb-0 w-full">
                                    {bundle.bundle_id && !failedBundleImages.has(bundle.bundle_id) ? (
                                        <img
                                            src={`/api/bundles/${bundle.bundle_id}/image`}
                                            alt={bundle.name}
                                            width={64}
                                            height={64}
                                            className="w-16 h-16 object-cover rounded mr-3"
                                            onError={() => handleImageError(bundle.bundle_id)}
                                        />
                                    ) : (
                                        <div className="w-16 h-16 bg-muted rounded mr-3 flex items-center justify-center">
                                            <span className="text-muted-foreground text-xs">No Image</span>
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <p className="text-primary/70 text-custom-sm font-semibold">
                                            {bundle.name}
                                        </p>

                                        <div className="flex flex-wrap flex-col items-star  text-left justify-start w-full t my-2 gap-2">
                                            {bundle.podcasts.map(p => (
                                                <Badge
                                                    key={p.podcast_id}
                                                    variant="outline"
                                                    className="text-xxs text-foreground inline-flex items-center w-full text-left p-2 m-0">
                                                    {p.name}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Actions */}
                                </div>
                                <div className="flex items-center gap-2">
                                    {isEditing ? (
                                        <>
                                            <Button variant="outline" size="xs" onClick={cancelEdit}>
                                                Cancel
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                className="my-4"
                                                size="sm"
                                                onClick={saveEdit}
                                                disabled={isPending || !editForm.name.trim()}>
                                                Save
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => startEdit(bundle)}>
                                                Edit
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => deleteBundle(bundle as BundleWithPodcasts)}
                                                className="text-destructive">
                                                Delete
                                            </Button>
                                        </>
                                    )}
                                </div>
                                {/* EDIT FORM - inline when editing */}
                                {isEditing && (
                                    <div className="flex flex-col mt-4 p-4 border rounded-lg bg-muted/50">
                                        <div className="flex flex-col gap-4 mb-4">
                                            <div>
                                                <Label htmlFor="editName">Name</Label>
                                                <Input
                                                    id="editName"
                                                    value={editForm.name}
                                                    onChange={e =>
                                                        setEditForm(s => ({ ...s, name: e.target.value }))
                                                    }
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="editImage">Bundle Image</Label>
                                                <Input
                                                    id="editImage"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleEditImageChange}
                                                />
                                                {editImagePreview || (!failedBundleImages.has(bundle.bundle_id) && bundle.bundle_id) ? (
                                                    <div className="mt-2">
                                                        <img
                                                            src={editImagePreview || `/api/bundles/${bundle.bundle_id}/image`}
                                                            alt="Current"
                                                            width={80}
                                                            height={80}
                                                            className="w-20 h-20 object-cover rounded"
                                                            onError={() => handleImageError(bundle.bundle_id)}
                                                        />
                                                    </div>
                                                ) : null}
                                            </div>
                                            <div>
                                                <Label htmlFor="editDescription">Description</Label>
                                                <Textarea
                                                    id="editDescription"
                                                    className="h-full max-h-[180px]"
                                                    rows={2}
                                                    value={editForm.description}
                                                    onChange={e =>
                                                        setEditForm(s => ({
                                                            ...s,
                                                            description: e.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="editMinPlan">Visibility</Label>
                                                <select
                                                    id="editMinPlan"
                                                    className="w-full border rounded h-9 px-2 bg-background"
                                                    value={editForm.min_plan}
                                                    onChange={e =>
                                                        setEditForm(s => ({
                                                            ...s,
                                                            min_plan: e.target.value,
                                                        }))
                                                    }>
                                                    {(planGatesLoaded
                                                        ? planGateOptions
                                                        : [{ value: "NONE", label: "Free (All users)" }]
                                                    ).map(opt => (
                                                        <option key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <Label>Select Podcasts</Label>
                                            <div
                                                className="mt-2 border rounded-lg p-3"
                                                style={{ maxHeight: "200px", overflowY: "auto" }}>
                                                {availablePodcasts.map(p => (
                                                    <div
                                                        key={p.podcast_id}
                                                        className="flex items-center space-x-2 py-1">
                                                        <Checkbox
                                                            id={`edit-pod-${p.podcast_id}`}
                                                            checked={editForm.selectedPodcastIds.includes(p.podcast_id)}
                                                            onCheckedChange={() =>
                                                                toggleEditPodcastSelection(p.podcast_id)
                                                            }
                                                        />
                                                        <Label
                                                            htmlFor={`edit-pod-${p.podcast_id}`}
                                                            className="font-normal cursor-pointer">
                                                            <p className="text-xs font-light ml-2 text-left">
                                                                {p.name}
                                                            </p>
                                                        </Label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {bundles.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                            No bundles created yet.
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
