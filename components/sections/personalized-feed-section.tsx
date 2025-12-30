"use client";

import { useEffect, useState } from "react";

interface SectionProps {
	isActive: boolean;
}

export function PersonalizedFeedSection({ isActive }: SectionProps) {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		if (isActive) {
			setMounted(false);
			const timer = setTimeout(() => setMounted(true), 100);
			return () => clearTimeout(timer);
		}
	}, [isActive]);

	return (
		<div className="relative h-full w-full bg-white overflow-hidden">
			{/* Bottom gradient - Apple Health heart section style */}
			<div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-purple-100/50 to-transparent" />

			<div className="relative z-10 h-full flex flex-col justify-center px-6 md:px-12 lg:px-24 max-w-6xl mx-auto">
				<div
					className={`transition-all duration-1000 ${
						mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
					}`}>
					<h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-gray-900 text-balance leading-tight">
						Research Terminal.
						<br />
						<span className="text-emerald-400">Curated for Performance.</span>
					</h2>
				</div>

				<div className="mt-12 grid md:grid-cols-2 gap-12">
					<div
						className={`transition-all duration-1000 ${
							mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
						}`}
						style={{ transitionDelay: "200ms" }}>
						<h3 className="text-2xl font-semibold text-gray-900 mb-4">
							Institutional <span className="text-gray-400">BUNDLES</span>
						</h3>
						<p className="text-gray-600 leading-relaxed text-lg">
							Subscribe to pre-configured intelligence bundles covering Global Macro,
							Equity Rotation, or Fixed Income. Automated reports and PM-briefings land
							directly in your feed as they break.
						</p>
					</div>

					<div
						className={`transition-all duration-1000 ${
							mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
						}`}
						style={{ transitionDelay: "400ms" }}>
						<h3 className="text-2xl font-semibold text-gray-900 mb-4">
							Custom <span className="text-gray-400">PIPELINE</span>
						</h3>
						<p className="text-gray-600 leading-relaxed text-lg">
							Upload your own proprietary research or link specific earnings calls and
							industry panels. Our AI identifies the tickers, extracts the sentiment, and
							cross-references claims against the ground-truth in your vault.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
