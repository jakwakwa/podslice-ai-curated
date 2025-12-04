"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface SectionProps {
	isActive: boolean;
}

export function HeroSection({ isActive }: SectionProps) {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		if (isActive) {
			const timer = setTimeout(() => setMounted(true), 100);
			return () => clearTimeout(timer);
		}
	}, [isActive]);

	return (
		<div className="relative h-full w-full bg-linear-to-br from-blue-600 via-blue-700 to-indigo-800 overflow-hidden">
			{/* Animated circles - Apple Health style */}
			<div className="absolute inset-0">
				<div
					className={`absolute w-[600px] h-[600px] rounded-full bg-blue-400/30 -top-20 -left-40 transition-all duration-2000 ease-out ${
						mounted ? "scale-100 opacity-100" : "scale-50 opacity-0"
					}`}
					style={{ transitionDelay: "200ms" }}
				/>
				<div
					className={`absolute w-[700px] h-[700px] rounded-full bg-cyan-400/20 top-1/4 right-[-200px] transition-all duration-2000 ease-out ${
						mounted ? "scale-100 opacity-100" : "scale-50 opacity-0"
					}`}
					style={{ transitionDelay: "400ms" }}
				/>
				<div
					className={`absolute w-[500px] h-[500px] rounded-full bg-blue-300/25 bottom-[-100px] left-1/3 transition-all duration-2000 ease-out ${
						mounted ? "scale-100 opacity-100" : "scale-50 opacity-0"
					}`}
					style={{ transitionDelay: "600ms" }}
				/>
				<div
					className={`absolute w-[400px] h-[400px] rounded-full bg-indigo-400/20 top-1/3 left-1/4 transition-all duration-2000 ease-out ${
						mounted ? "scale-100 opacity-100" : "scale-50 opacity-0"
					}`}
					style={{ transitionDelay: "800ms" }}
				/>
			</div>

			{/* Content */}
			<div className="relative z-10 h-full flex flex-col items-center justify-center px-6 text-center">
				<div
					className={`transition-all duration-1000 ${
						mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
					}`}
					style={{ transitionDelay: "300ms" }}>
					<div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
						<svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
							<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
						</svg>
					</div>
					<p className="text-white/80 text-sm font-medium tracking-wide uppercase mb-4">
						Podslice
					</p>
				</div>

				<h1
					className={`text-4xl md:text-6xl lg:text-7xl font-semibold text-white max-w-4xl leading-tight text-balance transition-all duration-1000 ${
						mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
					}`}
					style={{ transitionDelay: "500ms" }}>
					Turn information overload into actionable insight.
				</h1>

				<p
					className={`mt-6 text-lg md:text-xl text-white/80 max-w-2xl transition-all duration-1000 ${
						mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
					}`}
					style={{ transitionDelay: "700ms" }}>
					Your personal AI assistant that transforms content into short, insightful audio
					and text summaries.
				</p>

				<div
					className={`mt-10 transition-all duration-1000 ${
						mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
					}`}
					style={{ transitionDelay: "900ms" }}>
					<Button
						variant="default"
						size="lg"
						className="bg-white hover:bg-gray-100 rounded-full px-8 py-6 text-lg font-medium">
						Start Your Free Trial
					</Button>
				</div>
			</div>

			{/* Scroll indicator */}
			<div
				className={`absolute bottom-8 left-1/2 -translate-x-1/2 transition-all duration-1000 ${
					mounted ? "opacity-100" : "opacity-0"
				}`}
				style={{ transitionDelay: "1200ms" }}>
				<div className="w-6 h-10 rounded-full border-2 border-white/40 flex items-start justify-center p-2">
					<div className="w-1 h-2 bg-white/60 rounded-full animate-bounce" />
				</div>
			</div>
		</div>
	);
}
