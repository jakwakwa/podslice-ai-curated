"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface SectionProps {
	isActive: boolean;
}

const plans = [
	{
		name: "Free Slice",
		description: "Get started for free and listen to our curated bundles.",
		price: "$0",
		features: [
			"Access to curated bundles",
			"Limited audio summaries",
			"Basic text breakdowns",
		],
		highlighted: false,
	},
	{
		name: "Casual Listener",
		description: "Unlock more content and features.",
		price: "$9",
		features: [
			"Everything in Free",
			"Unlimited audio summaries",
			"Full text breakdowns",
			"Priority processing",
		],
		highlighted: true,
	},
	{
		name: "Curate Control",
		description: "Get the full Podslice experience with custom summaries.",
		price: "$19",
		features: [
			"Everything in Casual",
			"YouTube link summaries",
			"News feed summaries",
			"Custom bundles",
			"Early access features",
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
						Find Your Perfect Plan
					</h2>
					<p className="mt-4 text-gray-600 text-lg">
						Podslice has a plan for every type of listener.
					</p>
				</div>

				<div className="grid md:grid-cols-3 gap-6">
					{plans.map((plan, index) => (
						<div
							key={plan.name}
							className={`relative p-8 rounded-3xl transition-all duration-700 ${
								plan.highlighted
									? "bg-linear-to-br from-pink-500 to-purple-600 text-white shadow-2xl scale-105"
									: "bg-white border border-gray-200 text-gray-900"
							} ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
							style={{ transitionDelay: `${200 + index * 150}ms` }}>
							{plan.highlighted && (
								<div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white text-pink-600 px-4 py-1 rounded-full text-sm font-medium shadow-lg">
									Most Popular
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
									/month
								</span>
							</div>
							<ul className="mt-6 space-y-3">
								{plan.features.map(feature => (
									<li key={feature} className="flex items-center gap-3">
										<Check
											className={`w-5 h-5 ${plan.highlighted ? "text-white" : "text-pink-500"}`}
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
										? "bg-white text-purple-600 hover:bg-gray-100"
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
