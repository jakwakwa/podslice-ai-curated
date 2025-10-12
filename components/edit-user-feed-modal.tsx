"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useBundlesStore } from "@/lib/stores/bundles-store"
import type { Bundle, UserCurationProfileWithRelations } from "@/lib/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"

type BundleWithInteraction = Bundle & { canInteract?: boolean }

interface EditUserFeedModalProps {
	isOpen: boolean
	onClose: () => void
	collection: UserCurationProfileWithRelations
	onSave: (updatedData: Partial<UserCurationProfileWithRelations>) => Promise<void>
}

export default function EditUserFeedModal({ isOpen, onClose, collection, onSave }: Readonly<EditUserFeedModalProps>): React.ReactElement {
	const [name, setName] = useState(collection?.name ?? "")
	const [selectedBundleId, setSelectedBundleId] = useState<string | undefined>(collection?.selected_bundle_id ?? undefined)
	const [isLoading, setIsLoading] = useState(false)
	const { bundles, fetchBundles, isLoading: isLoadingBundles } = useBundlesStore()

	useEffect(() => {
		if (isOpen && collection?.is_bundle_selection) {
			fetchBundles()
		}
	}, [isOpen, collection, fetchBundles])

	useEffect(() => {
		setName(collection?.name ?? "")
		setSelectedBundleId(collection?.selected_bundle_id ?? undefined)
	}, [collection])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsLoading(true)

		try {
			const dataToSave: Partial<UserCurationProfileWithRelations> = {
				name,
			}
			if (collection.is_bundle_selection) {
				dataToSave.selected_bundle_id = selectedBundleId
				dataToSave.is_bundle_selection = true
			}
			await onSave(dataToSave)
		} catch (error) {
			console.error("Failed to update profile:", error)
		} finally {
			setIsLoading(false)
		}
	}

	const availableBundles = bundles.filter((b: BundleWithInteraction) => b.canInteract)

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit Personalized Feed</DialogTitle>
					<DialogDescription>Update your personalized feed settings</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="mt-4 space-y-4">
					<div className="space-y-2">
						<Label htmlFor="name">Feed Name</Label>
						<Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Enter feed name" required />
					</div>
					{collection.is_bundle_selection && (
						<div className="space-y-2">
							<Label htmlFor="bundle">Change Bundle</Label>
							<Select value={selectedBundleId} onValueChange={setSelectedBundleId} disabled={isLoadingBundles || availableBundles.length === 0}>
								<SelectTrigger>
									<SelectValue placeholder={isLoadingBundles ? "Loading bundles..." : "Select a new bundle"} />
								</SelectTrigger>
								<SelectContent>
									{isLoadingBundles ? (
										<SelectItem value="loading" disabled>
											Loading...
										</SelectItem>
									) : availableBundles.length > 0 ? (
										availableBundles.map((bundle: Bundle) => (
											<SelectItem key={bundle.bundle_id} value={bundle.bundle_id}>
												{bundle.name}
											</SelectItem>
										))
									) : (
										<SelectItem value="no-bundles" disabled>
											No bundles available for your plan.
										</SelectItem>
									)}
								</SelectContent>
							</Select>
						</div>
					)}

					<div className="flex justify-between gap-2 pt-4">
						<Button type="button" variant="outline" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit" disabled={isLoading} variant="default">
							{isLoading ? "Saving..." : "Save Changes"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	)
}
