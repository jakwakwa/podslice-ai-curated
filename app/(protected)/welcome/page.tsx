"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
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

	const _handleUpgrade = async (_planCode: string | undefined) => { };

	return (
		<div className="bg-episode-card-wrapper h-full min-h-[84vh]  rounded-none 	px-0  mx-0 md:mx-3 flex flex-col lg:rounded-3xl md:rounded-4xl  md:mt-0 md:p-8 md:w-full  md:bg-episode-card-wrapper ">
			<PageHeader
				title="Your dashboard"
				description="Choose from our pre-curated podcast bundles. Each bundle is a fixed selection of 2-5 carefully selected shows and cannot be modified once selected."
			/>

			<div className="mt-8">
				<p className="text-sm my-1 text-center md:text-left leading-6 font-semibold text-secondary-foreground">Claim Your 14 Day Premium Trial</p>
				<Link href="/manage-membership">
					<Button variant="default" size="lg" className="bg-primary hover:bg-primary/90 text-foreground">
						Start Free Trial
					</Button>
				</Link>

				<div className="flex  text-center md:text-left w-full justify-center  md:justify-end items-center space-x-4 text-secondary mt-8">
					<Link href="/terms" className="transition-colors text-xs hover:underline  text-secondary-foreground w-fit font-medium ">
						Terms of use
					</Link>
					<span>•</span>
					<Link href="/privacy" className="w-fit transition-colors text-xs hover:underline  text-secondary-foreground font-medium">
						Privacy Policy
					</Link>
				</div>
			</div>



			<section className="w-[full] border-none  mb-0 p-0  mt-4 md:m-0 rounded-4xl md:p-0  outline-0  shadow-xl bg-sidebar/30 overflow-hidden" >
				<div className="text-left mb-0 min-w-full min-h-full bg-card ">
					<div className="text-left mb-0 px-6 xl:px-12 pt-8 ">
						<h2 className="text-2xl leading-9 font-semibold tracking-tight mb-4 text-primary-foreground">How It Works</h2>
						<p className=" leading-5 font-normal text-secondary-foreground 	 tracking-wide max-w-[600px] pb-6">
							Getting started with PODSLICE is simple. Follow these three easy steps to create your personalized podcast experience.
						</p>
					</div>

					<div className="md:px-4 pb-8  rounded-3xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-1 ">
						{howItWorks.map(step => (
							<Card key={step.step} className="transition-all bg-primary  h-full min-h-64 duration-200 ease-in-out relative rounded-3xl hover:-translate-y-1 shadow-lg  p-2 max-h-74 gap-2">
								<div className="flex flex-col p-3.5	h-fit items-center justify-center w-full gap-3 ">
									<div className="flex items-center justify-center w-4 h-4 p-4.5 rounded-full bg-teal-600 mx-0  text-success-foreground shadow-md  shadow-green-950/30  font-mono font-semibold text-h5 mb-1 ">
										{step.step}
									</div>
									<h3 className="text-xl text-center font-bold tracking-tight mb-2 mt-0 w-full text-secondary-foreground">
										{step.title}
									</h3>
									<p className="text-link/90 text-center font-medium text-sm leading-relaxed mb-4 text-secondary-foreground/70">{step.description}</p>
								</div>

							</Card >
						))
						}
					</div >
				</div>
			</section >
		</div >
	</div >
	)
}
