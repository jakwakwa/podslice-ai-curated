"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Body, Typography } from "@/components/ui/typography";
// Subscription store disabled in this build
// CSS module migrated to Tailwind classes

export default function WelcomePage() {
	const _router = useRouter();

	const _isLoading = false;
	const _tiers = [
		{ name: "FreeSlice", price: 0, description: "Free tier", features: ["Basic features"] },
		{ name: "Casual Listener", price: 5, description: "Tier 2", features: ["Weekly combo"] },
		{ name: "Curate & Control", price: 12, description: "Tier 3", features: ["All features"], popular: true },
	];

	const howItWorks = [
		{
			step: 1,
			title: "Create Your Profile",
			description: "Start by building a custom Personalized Feed or choose from our pre-PODSLICE Bundles.",
		},
		{
			step: 2,
			title: "Select Your Content",
			description: "Choose up to 5 individual podcasts or pick one of our 3 PODSLICE Bundles.",
		},
		{
			step: 3,
			title: "Get & Enjoy Your Podcast",
			description: "Our AI processes your selections and generates a personalized episode every Friday, then listen through our built-in audio player.",
		},
	];

	const _handleUpgrade = async (_planCode: string | undefined) => {};

	return (
		<div className="bg-sidebar rounded-3xl px-4">
			<section className="text-left mt-8  w-full pt-0 md:pt-0 pb-4 mb-0">
				<div className="w-full px-2 md:px-4">
					<Typography className="text-2xl font-bold text-left">Welcome!</Typography>
					<Body className="text-foreground/70 leading-6 mt-4 font-normal tracking-wide mb-0  max-w-[600px] w-full">
						Your personal AI-powered podcast curator that creates weekly episodes tailored to your interests. Choose from hand-picked content or create your own custom Personalized Feed.
					</Body>
					<div className="mt-6">
						<Link href="/manage-membership">
							<Button variant="default" size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
								Start Your Free Trial
							</Button>
						</Link>
					</div>
					<div className="flex justify-start  md:justify-end items-center space-x-4 text-foreground/70 mt-8">
						<Link href="/terms" className="hover:text-foreground transition-colors text-xs underline">
							Terms of Service
						</Link>
						<span>•</span>
						<Link href="/privacy" className="hover:text-foreground transition-colors text-xs underline">
							Privacy Policy
						</Link>
					</div>
				</div>
			</section>
			{/* How It Works */}
			<section className="flex flex-col justify-center w-full mb-4 py-8  mt-4 bg-card rounded-2xl md:px-12">
				<div className="text-left px-3 pt-2 mb-0">
					<h2 className="text-xl leading-9 font-semibold tracking-tight mb-4">How It Works</h2>
					<p className="text-custom-h5 leading-6 font-normal tracking-wide max-w-[600px] pb-6">
						Getting started with PODSLICE is simple. Follow these three easy steps to create your personalized podcast experience.
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-0 pb-2">
					{howItWorks.map(step => (
						<Card key={step.step} className="transition-all episode-card-wrapper duration-200 ease-in-out h-full relative hover:-translate-y-1 hover:shadow-lg main-card py-12">
							<div className="flex flex-col	 items-start justify-center w-full gap-2 h-10 my-4">
								<div className="flex items-center justify-center w-7 h-10 rounded-full bg-[#1D7558] border-2 mx-0 border-[#3C8C7091] text-primary-foreground font-semibold text-h5 mb-1">
									{step.step}
								</div>
								<Typography variant="h3" className="text-lg font-semibold tracking-tight mb-2 mt-0 w-full">
									{step.title}
								</Typography>
							</div>
							<p className="text-foreground/90 text-sm leading-relaxed mb-4">{step.description}</p>
						</Card>
					))}
				</div>
			</section>
		</div>
	);
}
