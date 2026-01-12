"use client";

import { Globe, Lock } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface PublicToggleButtonProps {
	episodeId: string;
	initialIsPublic: boolean;
	onToggleSuccess?: (isPublic: boolean) => void;
}

export default function PublicToggleButton({
	episodeId,
	initialIsPublic,
	onToggleSuccess,
}: PublicToggleButtonProps): React.ReactElement {
	const [isPublic, setIsPublic] = useState(initialIsPublic);
	const [isLoading, setIsLoading] = useState(false);

	const handleToggle = useCallback(async () => {
		// Store the previous state for potential rollback
		const previousState = isPublic;
		const newState = !isPublic;

		// OPTIMISTIC UPDATE: Update UI immediately
		setIsPublic(newState);
		onToggleSuccess?.(newState);
		setIsLoading(true);

		try {
			const response = await fetch(`/api/user-episodes/${episodeId}/toggle-public`, {
				method: "POST",
			});

			if (!response.ok) {
				const error = await response.text();
				throw new Error(error);
			}

			const data = await response.json();

			// Verify the server state matches our optimistic update
			// If not, correct it (though this should be rare)
			if (data.is_public !== newState) {
				setIsPublic(data.is_public);
				onToggleSuccess?.(data.is_public);
			}

			toast.success(data.is_public ? "Episode is now public" : "Episode is now private", {
				description: data.is_public
					? "Anyone with the link can listen to this episode"
					: "Only you can access this episode",
			});
		} catch (error) {
			// ROLLBACK: Revert to previous state on failure
			setIsPublic(previousState);
			onToggleSuccess?.(previousState);

			console.error("[PUBLIC_TOGGLE]", error);
			toast.error("Failed to update sharing settings", {
				description: error instanceof Error ? error.message : "Please try again later",
			});
		} finally {
			setIsLoading(false);
		}
	}, [episodeId, isPublic, onToggleSuccess]);

	return (
		<span className="flex items-center gap-4 text-xs">
			<Button
				type="button"
				variant={isPublic ? "default" : "outline"}
				size="sm"
				onClick={handleToggle}
				disabled={isLoading}>
				{isPublic ? (
					<Globe className="h-4 w-4 mr-2" />
				) : (
					<Lock className="h-4 w-4 mr-2" />
				)}
				{isLoading ? "Updating..." : isPublic ? "Public" : "Private"}
			</Button>
		</span>
	);
}
