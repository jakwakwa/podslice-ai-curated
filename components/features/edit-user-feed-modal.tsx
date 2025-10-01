"use client"

import { useState } from "react"
// import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { UserCurationProfileWithRelations } from "@/lib/types"

interface EditUserFeedModalProps {
	isOpen: boolean
	onClose: () => void
	collection: UserCurationProfileWithRelations
	onSave: (updatedData: Partial<UserCurationProfileWithRelations>) => Promise<void>
}

export function EditUserFeedModal({ isOpen, onClose, collection, onSave }: Readonly<EditUserFeedModalProps>) {
	const [name, setName] = useState(collection.name)
	const [isLoading, setIsLoading] = useState(false)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsLoading(true)

		try {
			await onSave({
				name,
			})
		} catch (error) {
			console.error("Failed to update profile:", error)
		} finally {
			setIsLoading(false)
		}
	}

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

					<div className="flex justify-end gap-2 pt-4">
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
