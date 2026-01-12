"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface SectionProps {
	isActive: boolean;
}

export function HeroSection({ isActive }: SectionProps) {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		if (isActive) {
			setMounted(false);
			const timer = setTimeout(() => setMounted(true), 100);
			return () => clearTimeout(timer);
		}
	}, [isActive]);

	return (
		<div className="relative h-full w-full bg-linear-to-br from-emerald-950 via-purple-950 to-indigo-950 overflow-hidden">
			{/* Animated circles - Apple Health style */}
			<div className="absolute inset-0">
				<div
					className={`absolute w-[600px] h-[600px] rounded-full bg-emerald-400/30 -top-20 -left-40 transition-all duration-2000 ease-out ${
						mounted ? "scale-100 opacity-100" : "scale-50 opacity-0"
					}`}
					style={{ transitionDelay: "200ms" }}
				/>
				<div
					className={`absolute w-[700px] h-[700px] rounded-full bg-emerald-400/20 top-1/4 right-[-200px] transition-all duration-2000 ease-out ${
						mounted ? "scale-100 opacity-100" : "scale-50 opacity-0"
					}`}
					style={{ transitionDelay: "400ms" }}
				/>
				<div
					className={`absolute w-[500px] h-[500px] rounded-full bg-emerald-300/25 bottom-[-100px] left-1/3 transition-all duration-2000 ease-out ${
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
			<div className="relative backdrop-blur-3xl z-10 h-full flex flex-col items-center justify-center px-6 text-center">
				<div
					className={`transition-all duration-1000 ${
						mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
					}`}
					style={{ transitionDelay: "300ms" }}>
					<div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center">
						<div className="flex items-center gap-2">
							<Image src={"icon.svg"} alt={""} width={170} height={300} />
						</div>
					</div>
				</div>

				<h1
					className={`text-4xl md:text-6xl lg:text-7xl font-semibold text-white max-w-4xl leading-tight text-balance transition-all duration-1000 ${
						mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
					}`}
					style={{ transitionDelay: "500ms" }}>
					Institutional Intelligence for the Modern Portfolio.
				</h1>

				<p
					className={`mt-6 text-lg md:text-xl text-white/80 max-w-2xl transition-all duration-1000 ${
						mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
					}`}
					style={{ transitionDelay: "700ms" }}>
					Move beyond simple summaries. Podslice extracts actionable signals, ticker
					sentiment, and contrarian insights from hours of audio and research documents in
					seconds.
				</p>

				<div
					className={`mt-10 transition-all duration-1000 ${
						mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
					}`}
					style={{ transitionDelay: "900ms" }}>
					<Button
						variant="default"
						size="lg"
						className="bg-purple-500 hover:bg-gray-100 rounded-full px-8 py-6 text-lg font-medium">
						<Link href="/sign-in" className="text-white">
							Start Your Free Trial
						</Link>
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
