"use client";
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes";
// @ts-ignore
import type React from "react";
import { useEffect } from "react";
import { SWRConfig } from "swr";
import { defaultSWRConfig } from "@/lib/swr";

export function ClientProviders({ children, ...props }: { children: React.ReactNode }) {
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
        const beforeInstallHandler = (e: Event & { prompt?: () => Promise<void> }) => {
            e.preventDefault();
            // Save the event for later use
            (window as Window & { deferredPwaPrompt?: typeof e }).deferredPwaPrompt = e;
            // Optionally, dispatch a custom event so components can react
            window.dispatchEvent(new CustomEvent("pwa-beforeinstallprompt"));
        };

        window.addEventListener("beforeinstallprompt", beforeInstallHandler as EventListener);

        return () => {
            window.removeEventListener("beforeinstallprompt", beforeInstallHandler as EventListener);
        };
    }, []);

    return (
        <SWRConfig value={defaultSWRConfig}>
            <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange {...props}>
                {children}
            </ThemeProvider>
        </SWRConfig>
    );
}

function ThemeProvider({ children, ...props }: ThemeProviderProps) {
    return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
