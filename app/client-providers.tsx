"use client";
// @ts-ignore
import type React from "react";
import { useEffect } from "react";
import { ThemeProvider } from "@/components/theme-provider";

export function ClientProviders({ children }: { children: React.ReactNode }) {
	useEffect(() => {
		if (process.env.NODE_ENV !== "production") return; // only register SW in production builds

		if ("serviceWorker" in navigator) {
			window.addEventListener("load", () => {
				navigator.serviceWorker
					.register("/sw.js")
					.then(registration => {
						console.log("Service Worker registered: ", registration);
					})
					.catch(error => {
						console.log("Service Worker registration failed: ", error);
					});
			});
		}

		// Capture the beforeinstallprompt event to trigger install from our UI
		const beforeInstallHandler = (e: any) => {
			e.preventDefault();
			// Save the event for later use
			(window as any).deferredPwaPrompt = e;
			// Optionally, dispatch a custom event so components can react
			window.dispatchEvent(new CustomEvent("pwa-beforeinstallprompt"));
		};

		window.addEventListener("beforeinstallprompt", beforeInstallHandler as EventListener);

		return () => {
			window.removeEventListener("beforeinstallprompt", beforeInstallHandler as EventListener);
		};
	}, []);

	return <ThemeProvider attribute="class">{children}</ThemeProvider>;
}
