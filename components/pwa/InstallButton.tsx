"use client";
import type React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function InstallButton(): React.ReactElement | null {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    function onCustomPrompt(e: any) {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    }

    function onNativePrompt(e: any) {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    }

    window.addEventListener("pwa-beforeinstallprompt", onCustomPrompt as EventListener);
    window.addEventListener("beforeinstallprompt", onNativePrompt as EventListener);

    return () => {
      window.removeEventListener("pwa-beforeinstallprompt", onCustomPrompt as EventListener);
      window.removeEventListener("beforeinstallprompt", onNativePrompt as EventListener);
    };
  }, []);

  async function handleInstallClick(): Promise<void> {
    const promptEvent = deferredPrompt ?? (window as any).deferredPwaPrompt;
    if (!promptEvent) return;

    try {
      promptEvent.prompt();
      if (promptEvent.userChoice) {
        await promptEvent.userChoice;
      }
    } catch (err) {
      console.error("PWA prompt failed:", err);
    } finally {
      setVisible(false);
      setDeferredPrompt(null);
      // clear saved prompt
      (window as any).deferredPwaPrompt = null;
    }
  }

  if (!visible) return null;

  return (
    <Button onClick={handleInstallClick} size="sm" variant="ghost" className="mr-2">
      Install
    </Button>
  );
}

