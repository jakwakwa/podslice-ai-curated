"use client";

import { Loader2 } from "lucide-react";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Typography } from "@/components/ui/typography";
import type { Bundle, Podcast } from "@/lib/types";

type DialogBundle =
	| (Bundle & {
		podcasts: Podcast[];
		canInteract?: boolean;
		lockReason?: string | null;
		bundleType?: "curated" | "shared";
		shared_bundle_id?: string;
	})
	| null;

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
	// Separate tracking for curated and shared bundles
	currentCuratedBundleName?: string | null;
	currentCuratedBundleId?: string | null;
	currentSharedBundleName?: string | null;
	currentSharedBundleId?: string | null;
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
	currentCuratedBundleName,
	currentCuratedBundleId,
	currentSharedBundleName,
	currentSharedBundleId,
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

	// Determine bundle type
	const isSharedBundle = selectedBundle?.bundleType === "shared";

	// Get the appropriate current bundle name based on type being selected
	const currentBundleName = isSharedBundle ? currentSharedBundleName : currentCuratedBundleName;
	const currentBundleId = isSharedBundle ? currentSharedBundleId : currentCuratedBundleId;

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

	let _shouldShowAlreadySelectedReminder = false;
	if (!isLocked) {
		if (isAlreadySelected) {
			_shouldShowAlreadySelectedReminder = true;
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="w-full">
				<DialogHeader>
					<DialogTitle>
						{isLocked
							? "Upgrade required"
							: isAlreadySelected
								? "This is your active bundle"
								: isFirstSelection
									? isSharedBundle
										? "Select Shared Bundle"
										: "Activate Curated Bundle"
									: isSharedBundle
										? "Switching Shared Bundle..."
										: "Switching Curated Bundle..."}
					</DialogTitle>
					<DialogDescription className=" min-w-full gap-6 flex flex-col text-base ">
						{(() => {
							if (isLocked) {
								return (
									lockReason ?? (
										<span>
											{sanitizedSelectedBundleName} requires the ${requiredPlanText} plan.
										</span>
									)
								);
							}

							if (isAlreadySelected) {
								return (
									<span>
										<strong className="font-bold text-cyan-950/90">{sanitizeText(selectedBundle.name)} Bundle </strong> is already active in your profile
									</span>
								);
							}

							if (isFirstSelection) {
								if (isSharedBundle) {
									return `You're about to select the shared bundle '$sanitizeText(selectedBundle.name)'. Name your profile below to continue.`;
								}
								return `You're about to activate '${sanitizeText(selectedBundle.name)}' as your curated podcast bundle. Name it below to finish setting up your feed.`;
							}

							if (sanitizedCurrentBundleName) {
								if (isSharedBundle) {
									return (
										<span>
											You're about to change your shared bundle from {sanitizedCurrentBundleName} to {sanitizeText(selectedBundle.name)}{" "}
										</span>
									);
								}
								return (
									<span className="leading-8">
										You're about to change your curated bundle:
										<br /> <span className="uppercase text-xs italic font-bold text-foreground/50">From </span>
										<strong className="font-bold italic text-cyan-950/90">{sanitizedCurrentBundleName}</strong> →{" "}
										<strong className="font-bold italic text-cyan-900/80">{sanitizeText(selectedBundle.name)}</strong>{" "}
									</span>
								);
							}

							if (isSharedBundle) {
								return `You're about to select '${sanitizeText(selectedBundle.name)}' as your shared bundle. This will add episodes from this bundle to your feed.`;
							}
							return `You're about to select '${sanitizeText(selectedBundle.name)}' as your curated podcast bundle. This will update your podcast feed.`;
						})()}
						{shouldShowSwitchWarning && (
							<div className="space-y-4 min-w-full">
								{/* Warning Message */}
								<div className="px-3 py-2 bg-amber-600/50 outline outline-amber-600/30 dark:border-amber-800 rounded-sm inline-block">
									<Typography variant="body" className="text-amber-200  text-sm">
										{isSharedBundle
											? `You'll lose access to episodes from '${sanitizedCurrentBundleName}' after switching`
											: `You won't have access to '${sanitizedCurrentBundleName}' episodes after changing`}
									</Typography>
								</div>
							</div>
						)}

						{shouldShowNameInput && (
							<div className=" space-y-2 min-w-full">
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
							<div className=" min-w-full">
								<Typography variant="body" className="text-sm text-muted-foreground">
									{requiredPlanDescriptionText}
								</Typography>
							</div>
						)}
					</DialogDescription>
				</DialogHeader>

				<DialogFooter>
					<div className="w-full p-0 m-0 max-w-full flex flex-row items-center justify-between">
						{isLocked ? (
							<Button type="button" variant="default" onClick={onClose} className="">
								Back
							</Button>
						) : isAlreadySelected ? (
							<Button type="button" variant="default" onClick={onClose} className="">
								Close
							</Button>
						) : (
							<>
								<Button type="button" variant="outline" className="w-full px-0 mx-0" onClick={onClose} disabled={isConfirming}>
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
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
