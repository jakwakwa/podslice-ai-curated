"use client";

import { FileAudio, Layers, ListChecks, Newspaper, Volume2, Youtube } from "lucide-react";
import { useEffect, useState } from "react";

interface SectionProps {
	isActive: boolean;
}

const features = [
	{
		icon: Youtube,
		title: "Summarize YouTube Videos",
		description:
			"Convert any YouTube video into a concise audio episode and detailed text breakdown with one click.",
	},
	{
		icon: FileAudio,
		title: "Dual-Format Summaries",
		description:
			"Every summary includes both a podcast-style audio episode and a dedicated, structured text page.",
	},
	{
		icon: ListChecks,
		title: "Structured Text Breakdowns",
		description:
			"Get key takeaways, short summaries, target audience info, and relevant topics.",
	},
	{
		icon: Newspaper,
		title: "Get News Summaries",
		description:
			"Stay on top of current events with AI-powered news briefings in both audio and text.",
	},
	{
		icon: Volume2,
		title: "High-Quality AI Voices",
		description:
			"Listen to smooth, natural-sounding audio powered by advanced AI voice technology.",
	},
	{
		icon: Layers,
		title: "Curated Bundles",
		description:
			"Subscribe to channels and topics you love and get a steady stream of summaries automatically.",
	},
];

export function FeaturesSection({ isActive }: SectionProps) {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		if (isActive) {
			setMounted(false);
			const timer = setTimeout(() => setMounted(true), 100);
			return () => clearTimeout(timer);
		}
	}, [isActive]);

	return (
		<div className="relative h-full w-full bg-linear-to-br from-gray-900 via-gray-900 to-indigo-950 overflow-hidden">
			{/* Subtle background circles */}
			<div className="absolute inset-0">
				<div className="absolute w-[500px] h-[500px] rounded-full bg-purple-500/5 -top-40 -right-40" />
				<div className="absolute w-[600px] h-[600px] rounded-full bg-blue-500/5 bottom-0 -left-40" />
			</div>

			<div className="relative z-10 h-full flex flex-col justify-center px-6 md:px-12 lg:px-24 max-w-7xl mx-auto">
				<div
					id="features"
					className={`text-center mb-12 transition-all duration-1000 ${
						mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
					}`}>
					<h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-white text-balance">
						Features at a Glance
					</h2>
				</div>

				<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
					{features.map((feature, index) => (
						<div
							key={feature.title}
							className={`p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-700 ${
								mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
							}`}
							style={{ transitionDelay: `${150 + index * 100}ms` }}>
							<feature.icon className="w-8 h-8 text-violet-400 mb-4" />
							<h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
							<p className="text-gray-400 text-sm leading-relaxed">
								{feature.description}
							</p>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
