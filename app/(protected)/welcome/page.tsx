"use client";

import FreeTrialPromo from "@/components/shared/free-trial-promo";
import CommonSectionWithChildren from "@/components/shared/section-common";
import StepCard from "@/components/shared/step-card";
import { PageHeader } from "@/components/ui/page-header";

export const welcomePageContent = {
	title: "How It Works",
	description:
		"Getting started with Podslice.ai is straightforward. Follow these four simple steps to create your focused content experience.",
	howItWorks: [
		{
			step: 1,
			title: "Create Your Profile",
			description:
				"Start by building a custom Personalized Feed or choose from our pre-PODSLICE Bundles.",
		},
		{
			step: 2,
			title: "Select Your Content",
			description:
				"Choose up to 5 individual podcasts or pick one of our 3 PODSLICE Bundles.",
		},
		{
			step: 3,
			title: "Get & Enjoy Your Podcast",
			description:
				"Our AI processes your selections and generates a personalized episode every Friday, then listen through our built-in audio player.",
		},
	],
	cta: {
		title: "Start Free Trial",
		description:
			"Click the button to explore our bundles and try out our AI curated bundles.",
		button: {
			text: "Start Free Trial",
			link: "/manage-membership",
		},
	},
};

export default function WelcomePage() {
	const { title, description, howItWorks, cta } = welcomePageContent;
	return (
		<div className="flex flex-col gap-4">
			<PageHeader title={cta.title} description={cta.description} />
			<FreeTrialPromo
				href={cta.button.link}
				size="lg"
				variant="default"
				buttonText={cta.button.text}
			/>
			<CommonSectionWithChildren title={title} description={description}>
				<div className="md:px-4 pb-8 mx-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 p-1 gap-4">
					{howItWorks.map((step, index: number) => (
						<StepCard
							key={`${index + 1}-${step.title}`}
							step={index + 1}
							title={step.title}
							description={step.description}
						/>
					))}
				</div>
			</CommonSectionWithChildren>
		</div>
	);
}
