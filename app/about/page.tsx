import type { Metadata } from "next";
import { Footer } from "@/app/(protected)/footer";
import AboutCTASection from "@/app/about/_components/about-cta-section";
import AboutHowItWorksSection from "@/app/about/_components/about-how-it-works-section";
import AboutPersonalFeedSection from "@/app/about/_components/about-personal-feed-section";
import AboutSection from "@/app/about/_components/about-section";
import { LandingPageHeader } from "@/components/layout/LandingPageHeader";
import AboutFeaturesSection from "./_components/about-features-section";
import AboutHero from "./_components/about-hero";

export const metadata: Metadata = {
	title: "About Podslice | AI-Powered Content Summaries",
	description:
		"Podslice transforms YouTube videos, podcasts, and news into concise audio and text summaries using advanced AI. Save hours while staying informed.",
	keywords: [
		"Podslice",
		"AI summaries",
		"podcast summaries",
		"YouTube summaries",
		"audio summaries",
		"content curation",
	],
	openGraph: {
		title: "About Podslice | Cut the Chatter, Keep the Insight",
		description:
			"Transform endless content into short, insightful audio and text summaries. Stay smart and informed while saving hours of your time.",
		url: "https://podslice.ai/about",
		siteName: "PODSLICE AI",
		images: [{ url: "/podslice-og.jpg" }],
	},
};

export default function AboutPage() {
	return (
		<>
			<LandingPageHeader />
			<div className="min-h-screen bg-gradient-to-t to-transparent to-90% via-[var(--beduk-4)] from-chart-2 from-0%">
				{/* Hero Section */}
				<AboutHero />

				{/* What is Podslice Section */}

				{/* How It Works Section */}
				<AboutSection title="How It Works (The AI Magic)" className="py-20">
					<AboutHowItWorksSection />
				</AboutSection>

				{/* Your Personal Feed Section */}
				<AboutSection
					title="Personalized Feed"
					className="bg-gradient-to-br from-[var(--swak-1)] via-[var(--swak-1)] to-[var(--swak-1)]">
					<AboutPersonalFeedSection />
				</AboutSection>

				{/* Features Section */}
				<AboutSection title="Features at a Glance" className="py-20">
					<AboutFeaturesSection />
				</AboutSection>

				{/* Plans Section */}
				<AboutSection
					title="Find Your Perfect Plan"
					className="bg-gradient-to-br from-[var(--swak-2)] via-[var(--swak-1)] to-[var(--swak-1)]">
					<div className="max-w-4xl mx-auto">
						<p className="text-lg text-foreground leading-relaxed text-center mb-12">
							Podslice has a plan for every type of listener.
						</p>
						<div className="space-y-6">
							{[
								{
									name: "Free Slice",
									description: "Get started for free and listen to our curated bundles.",
								},
								{
									name: "Casual Listener",
									description: "Unlock more content and features.",
								},
								{
									name: "Curate Control",
									description:
										"Get the full Podslice experience with the power to create your own summaries from YouTube links and news feeds.",
								},
							].map(plan => (
								<div
									key={plan.name}
									className="p-6 rounded-xl border border-border hover:border-primary transition-all duration-300">
									<h3 className="text-xl font-bold text-primary-foreground-muted mb-2">
										{plan.name}
									</h3>
									<p className="text-secondary-foreground">{plan.description}</p>
								</div>
							))}
						</div>
					</div>
				</AboutSection>

				{/* CTA Section */}
				<AboutCTASection />
			</div>
			<Footer />
		</>
	);
}
