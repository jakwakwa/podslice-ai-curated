"use client";

import AboutFeatureCard from "./about-feature-card";
import {
	Volume2,
	FileText,
	CheckCircle2,
	Newspaper,
	Sparkles,
	Radio,
} from "lucide-react";

export default function AboutFeaturesSection() {
	const mainFeatures = [
		{
			icon: Volume2,
			title: "Summarize YouTube Videos",
			description:
				"Convert any YouTube video into a concise audio episode and detailed text breakdown with one click.",
		},
		{
			icon: FileText,
			title: "Dual-Format Summaries",
			description:
				"Every summary includes both a podcast-style audio episode and a dedicated, structured text page.",
		},
		{
			icon: CheckCircle2,
			title: "Structured Text Breakdowns",
			description:
				"Get key takeaways, short summaries, target audience info, and relevant topics so you can quickly find what you need.",
		},
		{
			icon: Newspaper,
			title: "Get News Summaries",
			description:
				"Stay on top of current events with AI-powered news briefings in both audio and text.",
		},
		{
			icon: Sparkles,
			title: "High-Quality AI Voices",
			description:
				"Listen to smooth, natural-sounding audio powered by advanced AI voice technology.",
		},
		{
			icon: Radio,
			title: "Curated Bundles",
			description:
				"Subscribe to channels and topics you love and get a steady stream of summaries automatically.",
		},
	];

	return (
		<div className="max-w-6xl bg-bigcard mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-6">
			{mainFeatures.map((feature, index) => (
				<AboutFeatureCard
					key={index}
					icon={feature.icon}
					title={feature.title}
					description={feature.description}
				/>
			))}
		</div>
	);
}

