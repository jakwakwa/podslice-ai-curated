"use client";

import { Loader2 } from "lucide-react";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Typography } from "@/components/ui/typography";
import type { Bundle, Podcast } from "@/lib/types";

type DialogBundle = (Bundle & { podcasts: Podcast[]; canInteract?: boolean; lockReason?: string | null }) | null;

// Simple function to sanitize text for safe display
function sanitizeText(text: string | null | undefined): string {
	if (!text) return "";
	// Remove any potential HTML/script tags and escape special characters
	return text.replace(/[<>&"']/g, char => {
		switch (char) {
			case "<":
				return "&lt;";
			case ">":
				return "&gt;";
			case "&":
				return "&amp;";
			case '"':
				return "&quot;";
			case "'":
				return "&#x27;";
			default:
				return char;
		}
	});
}

interface BundleSelectionDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: (payload: { bundleId: string; profileName?: string }) => Promise<void>;
	selectedBundle: DialogBundle;
	currentBundleName?: string | null;
	currentBundleId?: string | null;
	isLoading?: boolean;
	requiresProfileCreation: boolean;
	mode: "select" | "locked";
	lockReason?: string | null;
	requiredPlanLabel?: string;
	requiredPlanDescription?: string;
}

export function BundleSelectionDialog({
	isOpen,
	onClose,
	onConfirm,
	selectedBundle,
	currentBundleName,
	currentBundleId,
	isLoading = false,
	requiresProfileCreation,
	mode,
	lockReason,
	requiredPlanLabel,
	requiredPlanDescription,
}: BundleSelectionDialogProps) {
	const [isConfirming, setIsConfirming] = useState(false);
	const [profileName, setProfileName] = useState<string>("");
	const [nameError, setNameError] = useState<string | null>(null);
	const previousBundleIdRef = useRef<string | null>(null);

	const isLocked = mode === "locked";
	const isFirstSelection = requiresProfileCreation && !isLocked;

	const sanitizedCurrentBundleName = currentBundleName ? sanitizeText(currentBundleName) : "";
	const sanitizedSelectedBundleName = selectedBundle ? sanitizeText(selectedBundle.name) : "";

	const handleConfirm = async () => {
		if (isLocked) {
			onClose();
			return;
		}

		if (!selectedBundle) return;

		if (isFirstSelection) {
			const trimmed = profileName.trim();
			if (!trimmed) {
				setNameError("Please enter a name to continue");
				return;
			}
			setNameError(null);
		}

		setIsConfirming(true);
		try {
			await onConfirm({
				bundleId: selectedBundle.bundle_id,
				profileName: isFirstSelection ? profileName.trim() : undefined,
			});
			setProfileName("");
			onClose();
		} catch (error) {
			console.error("Failed to select bundle:", error);
		} finally {
			setIsConfirming(false);
		}
	};

	// Check if user already has this bundle selected (only relevant in selection mode)
	const isAlreadySelected = isLocked ? false : selectedBundle ? currentBundleId === selectedBundle.bundle_id : false;
	const showSwitchWarning = !isLocked && Boolean(sanitizedCurrentBundleName) && !isAlreadySelected;

	// Pre-populate profile name when dialog opens for first-time selection
	const handleProfileNameChange = (event: ChangeEvent<HTMLInputElement>) => {
		setNameError(null);
		setProfileName(event.target.value);
	};

	useEffect(() => {
		if (!isOpen) {
			setProfileName("");
			setNameError(null);
			previousBundleIdRef.current = null;
			return;
		}

		if (!selectedBundle || isLocked) {
			return;
		}

		const hasBundleChanged = previousBundleIdRef.current !== selectedBundle.bundle_id;
		if (hasBundleChanged) {
			previousBundleIdRef.current = selectedBundle.bundle_id;
			if (isFirstSelection) {
				setProfileName(selectedBundle.name ?? "");
			}
		} else if (isFirstSelection && !profileName) {
			setProfileName(selectedBundle.name ?? "");
		}
	}, [isFirstSelection, isLocked, isOpen, profileName, selectedBundle]);

	if (!selectedBundle) {
		return null;
	}

	const requiredPlanText = requiredPlanLabel ?? "a higher";
	const requiredPlanDescriptionText = requiredPlanDescription ?? "Upgrade your plan to continue.";
	let shouldShowSwitchWarning = false;
	if (!isLocked) {
		if (!isAlreadySelected) {
			if (showSwitchWarning) {
				shouldShowSwitchWarning = true;
			}
		}
	}

	let shouldShowNameInput = false;
	if (!isLocked) {
		if (!isAlreadySelected) {
			if (isFirstSelection) {
				shouldShowNameInput = true;
			}
		}
	}

	let shouldShowAlreadySelectedReminder = false;
	if (!isLocked) {
		if (isAlreadySelected) {
			shouldShowAlreadySelectedReminder = true;
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>
						{isLocked
							? "Upgrade required"
							: isAlreadySelected
								? "Just a reminder!"
								: isFirstSelection
									? "Activate curated bundle"
									: "Switching Bundle Selection..."}
					</DialogTitle>
					<DialogDescription className="mt-4">
						{isLocked
							? lockReason ?? `'${sanitizedSelectedBundleName}' requires the ${requiredPlanText} plan.`
							: isAlreadySelected
								? `You already have "${sanitizeText(selectedBundle.name)}" selected`
								: isFirstSelection
									? `You're about to activate '${sanitizeText(selectedBundle.name)}' as your curated podcast bundle. Name it below to finish setting up your feed.`
									: sanitizedCurrentBundleName
										? `You're about to change from '${sanitizedCurrentBundleName} Bundle' to '${sanitizeText(selectedBundle.name)} Bundle'`
										: `You're about to select '${sanitizeText(selectedBundle.name)}' as your curated podcast bundle. This will update your podcast feed.`}
					</DialogDescription>
				</DialogHeader>

				{shouldShowSwitchWarning && (
					<div className="space-y-4">
						{/* Warning Message */}
						<div className="px-2 bg-amber-50 dark:bg-amber-600/10 outline outline-amber-700/50 dark:border-amber-800 rounded-lg inline-block">
							<Typography variant="body" className="text-amber-400 dark:text-amber-400/70 text-xs">
								{`You won't have access to ${sanitizedCurrentBundleName}'s episodes after changing`}
							</Typography>
						</div>
					</div>
				)}

				{shouldShowAlreadySelectedReminder && (
					<div className="space-y-4">
						{/* Reminder Message */}
						<div className="px-2 bg-blue-50 dark:bg-teal-400/10 border border-blue-200 dark:border-teal-800 rounded-lg w-fit">
							<Typography variant="body" className="text-teal-100 dark:text-teal-200 text-xs">
								This bundle is already active in your profile.
							</Typography>
						</div>
					</div>
				)}

				{shouldShowNameInput && (
					<div className="mt-4 space-y-2">
						<Label htmlFor="bundle-profile-name">Bundle name</Label>
						<Input id="bundle-profile-name" value={profileName} onChange={handleProfileNameChange} placeholder="e.g. My Weekly Slice" autoComplete="off" disabled={isConfirming || isLoading} />
						{nameError && (
							<Typography variant="body" className="text-xs text-red-400">
								{nameError}
							</Typography>
						)}
					</div>
				)}

				{isLocked && requiredPlanDescriptionText && (
					<div className="mt-6">
						<Typography variant="body" className="text-sm text-muted-foreground">
							{requiredPlanDescriptionText}
						</Typography>
					</div>
				)}

				<DialogFooter className="gap-2 mt-4">
					{isLocked ? (
						<Button type="button" variant="outline" onClick={onClose} className="min-w-[120px]">
							Back
						</Button>
					) : isAlreadySelected ? (
						<Button type="button" variant="default" onClick={onClose} className="w-1/3">
							Close
						</Button>
					) : (
						<>
							<Button type="button" variant="outline" onClick={onClose} disabled={isConfirming}>
								Cancel
							</Button>
							<Button type="button" variant="default" onClick={handleConfirm} disabled={isConfirming || isLoading} className="min-w-[120px]">
								{isConfirming ? (
									<div className="flex items-center">
										<Loader2 className="w-4 h-4 mr-2 animate-spin" />
										Updating...
									</div>
								) : (
									"Confirm Selection"
								)}
							</Button>
						</>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
