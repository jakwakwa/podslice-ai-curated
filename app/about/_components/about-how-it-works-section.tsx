"use client";

import {
	Sparkles,
	Zap,
	Volume2,
	FileText,
	CheckCircle2,
} from "lucide-react";

export default function AboutHowItWorksSection() {
	const steps = [
		{
			step: 1,
			icon: Zap,
			title: "You Find Content",
			description:
				"Simply provide a YouTube link you don't have time to watch or select a news topic you want to catch up on.",
		},
		{
			step: 2,
			icon: Sparkles,
			title: "AI Analysis",
			description:
				"Our advanced AI (powered by Google's Gemini) instantly analyzes the content, identifies the key points, and understands the main arguments.",
		},
		{
			step: 3,
			icon: FileText,
			title: "Smart Summaries & Scripts",
			description:
				"It then writes a detailed, structured text summary (including key takeaways, topics, target audience, and more) and uses that to generate a script for a conversational, mini-podcast.",
		},
		{
			step: 4,
			icon: Volume2,
			title: "Natural Audio",
			description:
				"We use a high-quality, natural-sounding AI voice to turn that script into a polished podcast episode that's genuinely easy to listen to.",
		},
		{
			step: 5,
			icon: CheckCircle2,
			title: "Ready For You",
			description:
				"Your new summary lands in your personal feed, complete with its own structured text page (featuring key takeaways, a short summary, target audience, and topics) and the polished, conversational audio episode.",
		},
	];

	return (
		<div className="max-w-5xl mx-auto space-y-8">
			{steps.map((step) => (
				<div
					key={step.step}
					className="flex gap-6 items-start p-6 rounded-xl bg-bigcard border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-lg"
				>
					<div className="flex-shrink-0">
						<div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
							<step.icon className="w-6 h-6 text-primary" />
						</div>
					</div>
					<div>
						<div className="flex items-center gap-3 mb-2">
							<span className="text-sm font-bold text-primary">
								Step {step.step}
							</span>
							<h3 className="text-xl font-bold text-foreground">
								{step.title}
							</h3>
						</div>
						<p className="text-foreground/70 leading-relaxed">
							{step.description}
						</p>
					</div>
				</div>
			))}
		</div>
	);
}

