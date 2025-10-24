"use client";
import { Download } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

type InstallPromptEvent = Event & {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

interface NavigatorWithStandalone extends Navigator {
	standalone?: boolean;
}

interface WindowWithPWA extends Window {
	deferredPwaPrompt?: InstallPromptEvent;
}

export default function InstallButton(): React.ReactElement | null {
	const [deferredPrompt, setDeferredPrompt] = useState<InstallPromptEvent | null>(null);
	const [isInstalled, setIsInstalled] = useState<boolean>(false);
	const [showInstallDialog, setShowInstallDialog] = useState<boolean>(false);
	const [isStandalone, setIsStandalone] = useState<boolean>(false);

	useEffect(() => {
		// Check if already running as installed PWA
		const checkStandalone =
			window.matchMedia("(display-mode: standalone)").matches ||
			(window.navigator as NavigatorWithStandalone).standalone ||
			document.referrer.includes("android-app://");

		setIsStandalone(checkStandalone);

		// Listen for app installed event
		const handleAppInstalled = () => {
			setIsInstalled(true);
			setDeferredPrompt(null);
			console.log("PWA was installed");
		};

		// Capture beforeinstallprompt
		const handleBeforeInstall = (e: Event) => {
			e.preventDefault();
			const promptEvent = e as InstallPromptEvent;
			setDeferredPrompt(promptEvent);

			// Also save to window for other components
			(window as WindowWithPWA).deferredPwaPrompt = promptEvent;

			console.log("beforeinstallprompt event captured");
		};

		// Listen for custom event from ClientProviders
		const handleCustomPrompt = () => {
			const savedPrompt = (window as WindowWithPWA).deferredPwaPrompt;
			if (savedPrompt) {
				setDeferredPrompt(savedPrompt);
			}
		};

		window.addEventListener("beforeinstallprompt", handleBeforeInstall);
		window.addEventListener("pwa-beforeinstallprompt", handleCustomPrompt);
		window.addEventListener("appinstalled", handleAppInstalled);

		return () => {
			window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
			window.removeEventListener("pwa-beforeinstallprompt", handleCustomPrompt);
			window.removeEventListener("appinstalled", handleAppInstalled);
		};
	}, []);

	function handleButtonClick(): void {
		// Show our custom dialog first
		setShowInstallDialog(true);
	}

	async function handleInstallConfirm(): Promise<void> {
		const promptEvent = deferredPrompt ?? (window as WindowWithPWA).deferredPwaPrompt;

		if (!promptEvent) {
			// No native prompt available - user will see manual instructions in dialog
			return;
		}

		try {
			// Close our dialog and trigger the native browser prompt
			setShowInstallDialog(false);

			await promptEvent.prompt();
			const choiceResult = await promptEvent.userChoice;

			if (choiceResult.outcome === "accepted") {
				console.log("User accepted the install prompt");
				setIsInstalled(true);
			} else {
				console.log("User dismissed the install prompt");
			}

			setDeferredPrompt(null);
			(window as WindowWithPWA).deferredPwaPrompt = undefined;
		} catch (err) {
			console.error("PWA prompt failed:", err);
			setShowInstallDialog(true); // Re-open to show manual instructions
		}
	}

	// Don't show if already installed/standalone
	if (isInstalled || isStandalone) {
		return null;
	}

	const hasNativePrompt =
		!!deferredPrompt || !!(window as WindowWithPWA).deferredPwaPrompt;

	return (
		<>
			<Button
				onClick={handleButtonClick}
				size="icon"
				variant="ghost"
				className="h-8 w-8"
				aria-label="Install Podslice app">
				<Download className="h-4 w-4" />
				<span className="sr-only">Install App</span>
			</Button>

			<Dialog open={showInstallDialog} onOpenChange={setShowInstallDialog}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle className="text-2xl">Install Podslice</DialogTitle>
						<DialogDescription className="pt-4 space-y-4">
							{/* Benefits section */}
							<div className="space-y-2">
								<p className="text-base font-semibold text-foreground">
									Get the best experience:
								</p>
								<ul className="space-y-1.5 text-sm">
									<li className="flex items-start gap-2">
										<span className="text-green-500 mt-0.5">✓</span>
										<span>Lightning-fast access from your home screen</span>
									</li>
									<li className="flex items-start gap-2">
										<span className="text-green-500 mt-0.5">✓</span>
										<span>Works offline - listen anytime, anywhere</span>
									</li>
									<li className="flex items-start gap-2">
										<span className="text-green-500 mt-0.5">✓</span>
										<span>Full screen experience without browser clutter</span>
									</li>
									<li className="flex items-start gap-2">
										<span className="text-green-500 mt-0.5">✓</span>
										<span>Native app feel with push notifications</span>
									</li>
								</ul>
							</div>

							{/* Install button or manual instructions */}
							{hasNativePrompt ? (
								<div className="pt-2">
									<Button
										onClick={handleInstallConfirm}
										variant="default"
										size="lg"
										className="w-full bg-background/20  hover:bg-primary/90">
										Install Now
									</Button>
									<p className="text-xs text-muted-foreground text-center mt-2">
										You'll see your browser's install prompt
									</p>
								</div>
							) : (
								<div className="space-y-3 pt-2">
									<p className="text-sm font-semibold text-foreground">
										Manual Installation:
									</p>

									<div className="space-y-3 text-sm bg-muted/50 p-4 rounded-lg">
										<div>
											<p className="font-medium mb-1.5">Chrome (Desktop):</p>
											<ol className="list-decimal list-inside space-y-1 text-xs ml-2">
												<li>Look for the install icon (⊕) in the address bar</li>
												<li>Or: Menu (⋮) → "Install Podslice"</li>
											</ol>
										</div>

										<div>
											<p className="font-medium mb-1.5">Chrome/Edge (Android):</p>
											<ol className="list-decimal list-inside space-y-1 text-xs ml-2">
												<li>Tap Menu (⋮) → "Add to Home screen"</li>
												<li>Tap "Add" to confirm</li>
											</ol>
										</div>

										<div>
											<p className="font-medium mb-1.5">Safari (iOS):</p>
											<ol className="list-decimal list-inside space-y-1 text-xs ml-2">
												<li>Tap Share button (□↑)</li>
												<li>Scroll down → "Add to Home Screen"</li>
												<li>Tap "Add"</li>
											</ol>
										</div>
									</div>
								</div>
							)}
						</DialogDescription>
					</DialogHeader>
				</DialogContent>
			</Dialog>
		</>
	);
}
