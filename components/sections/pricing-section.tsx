"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface SectionProps {
	isActive: boolean;
}

const plans = [
	{
		name: "Intelligence Trial",
		description: "Test the ground-truth protocol with our core bundles.",
		price: "FREE TRIAL",
		features: [
			"7-day trial then $4.50/mo",
			"Macro & Equity Bundles",
			"AI News Briefings",
		],
		highlighted: true,
	},
	{
		name: "Research Analyst",
		description: "Extended access for specialized research workflows.",
		price: "$2",
		features: ["All Intelligence Feeds", "Full Signal Breakdowns", "Priority Extraction"],
		highlighted: false,
	},
	{
		name: "Institutional PM",
		description: "The full Podslice terminal for modern portfolio management.",
		price: "$4.50",
		features: [
			"Everything in Analyst",
			"Proprietary PDF/Research Uploads",
			"Custom Ticker Sentiment Pipelines",
		],
		highlighted: false,
	},
];

export function PricingSection({ isActive }: SectionProps) {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		if (isActive) {
			setMounted(false);
			const timer = setTimeout(() => setMounted(true), 100);
			return () => clearTimeout(timer);
		}
	}, [isActive]);

	return (
		<div className="relative h-full w-full bg-gray-50 overflow-hidden">
			<div className="relative z-10 h-full flex flex-col justify-center px-6 md:px-12 lg:px-24 max-w-7xl mx-auto">
				<div
					id="pricing"
					className={`text-center mb-12 transition-all duration-1000 ${
						mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
					}`}>
					<h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-gray-900 text-balance">
						Performance-Driven Pricing
					</h2>
					<p className="mt-4 text-gray-600 text-lg">
						Select the intelligence tier that fits your research pipeline.
					</p>
				</div>

				<div className="grid md:grid-cols-3 gap-6">
					{plans.map((plan, index) => (
						<div
							key={plan.name}
							className={`relative p-8 rounded-3xl transition-all duration-700 ${
								plan.highlighted
									? "bg-linear-to-br from-purple-500 to-purple-600 text-white shadow-2xl scale-105"
									: "bg-white border border-gray-200 text-gray-900"
							} ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
							style={{ transitionDelay: `${200 + index * 150}ms` }}>
							{plan.highlighted && (
								<div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white text-purple-600 px-4 py-1 rounded-full text-sm font-medium shadow-lg">
									7 days free
								</div>
							)}
							<h3
								className={`text-xl font-semibold ${plan.highlighted ? "text-white" : "text-gray-900"}`}>
								{plan.name}
							</h3>
							<p
								className={`mt-2 text-sm ${plan.highlighted ? "text-white/80" : "text-gray-600"}`}>
								{plan.description}
							</p>
							<div className="mt-6">
								<span
									className={`text-4xl font-bold ${plan.highlighted ? "text-white" : "text-gray-900"}`}>
									{plan.price}
								</span>
								<span className={plan.highlighted ? "text-white/80" : "text-gray-600"}>
									{!plan.highlighted ? "/month" : null}
								</span>
							</div>
							<ul className="mt-6 space-y-3">
								{plan.features.map(feature => (
									<li key={feature} className="flex items-center gap-3">
										<Check
											className={`w-5 h-5 ${plan.highlighted ? "text-white" : "text-purple-500"}`}
										/>
										<span
											className={`text-sm ${plan.highlighted ? "text-white/90" : "text-gray-600"}`}>
											{feature}
										</span>
									</li>
								))}
							</ul>
							<Button
								variant="default"
								className={`w-full mt-8 rounded-full ${
									plan.highlighted
										? "bg-black text-purple-100 hover:bg-gray-100"
										: "bg-gray-900 text-white hover:bg-gray-800"
								}`}>
								Get Started
							</Button>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
