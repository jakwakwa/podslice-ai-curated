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
		<div className="bg-episode-card-wrapper h-full min-h-[84vh]  md:gap-4 rounded-none  overflow-hidden	px-0  mx-0 md:mx-3 flex flex-col lg:rounded-3xl md:rounded-4xl  mb-12 md:mt-0 md:p-8 md:w-full  md:bg-episode-card-wrapper ">
			<PageHeader
				title="Welcome to PODSLICE"
				description={`We're excited to have you on board. Let's get started! Click the button to explore our bundles and try out our AI curated bundles.`}
				button={
					<Link href="/curated-bundles">
						<Button variant="default" size="md">
							Explore Bundles
						</Button>
					</Link>
				}

			/>

			<div className="hidden p-4 my-8  md:px-8 md:my-8 flex flex-col justify-center items-center ">
				<p className=" my-3  py-2 flex flex-col justify-center items-center text-center text-base  leading-6 font-bold text-secondary-foreground  md:text-xl md:text-left md:justify-start md:items-start">Claim Your 14 Day Premium Trial</p>
				<Link href="/manage-membership">
					<Button variant="default" size="lg" className="w-full md:w-fit mx-auto md:mx-0  md:px-4">
						Start Free Trial
					</Button>
				</Link>


			</div>

			<section className="w-[full] border-none rounded-none  overflow-hidden mb-0 p-0  mt-0 md:mt-4 md:m-0  md:p-0  outline-0 md:rounded-4xl md:shadow-xl " >
				<div className="text-left pt-8 rounded-none  mb-5 pb-7 overflow-hidden md:rounded-4xl  md:py-0 min-w-full min-h-full bg-primary/70  ">
					<div className="text-left mb-0 px-6 xl:px-12  py-8 md:pt-8  ">
						<h2 className="text-2xl leading-9 font-semibold tracking-tight mb-4 text-primary-foreground">How It Works</h2>
						<p className=" leading-5 font-normal text-secondary-foreground 	 tracking-wide max-w-[600px] pb-6">
							Getting started with PODSLICE is simple. Follow these three easy steps to create your personalized podcast experience.
						</p>
					</div>

					<div className="md:px-4 pb-8 mx-5 rounded-3xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 p-1 gap-4   ">
						{howItWorks.map(step => (
							<Card key={step.step} className="transition-all bg-background/80  h-full min-h-64 duration-200 ease-in-out relative rounded-3xl hover:-translate-y-1 shadow-lg  p-2 max-h-74 gap-2">
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

	)
}
