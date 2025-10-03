"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function GlobalProgressBar({ className }: { className?: string }) {
	const [progress, setProgress] = useState(0);
	const [isVisible, setIsVisible] = useState(false);
	const [opacity, setOpacity] = useState(0);
	const _pathname = usePathname();

	useEffect(() => {
		// Start loading when route changes
		setIsVisible(true);
		setProgress(0);

		// Fade in
		const fadeInTimer = setTimeout(() => setOpacity(1), 50);

		// Simulate loading progress
		const timer1 = setTimeout(() => setProgress(30), 100);
		const timer2 = setTimeout(() => setProgress(60), 300);
		const timer3 = setTimeout(() => setProgress(90), 600);

		// Complete loading after a reasonable time
		const completeTimer = setTimeout(() => {
			setProgress(100);
			// Fade out then hide
			setTimeout(() => {
				setOpacity(0);
				setTimeout(() => {
					setIsVisible(false);
					setProgress(0);
				}, 100); // Wait for fade out to complete
			}, 200);
		}, 1000);

		return () => {
			clearTimeout(fadeInTimer);
			clearTimeout(timer1);
			clearTimeout(timer2);
			clearTimeout(timer3);
			clearTimeout(completeTimer);
		};
	}, []);

	if (!isVisible) return null;

	return (
		<div className={cn("fixed top-0 left-0 right-0 z-[9999] h-[1px] transition-opacity duration-300 ease-in-out", className)} style={{ opacity }}>
			<div
				className="h-full transition-all duration-300 ease-out"
				style={{
					width: `${progress}%`,
					backgroundColor: "oklch(0.86 0.21 153.42 / 0.5)",
					boxShadow: progress > 0 ? "0 0 10px oklch(0.86 0.21 153.42 / 0.3)" : "none",
				}}
			/>
		</div>
	);
}
