import type { Metadata } from "next";
import { LandingPageHeader } from "@/components/layout/LandingPageHeader";
import { Footer } from "@/app/(protected)/footer";
import AboutHero from "./_components/about-hero";
import AboutSection from "@/app/about/_components/about-section";
import AboutFeaturesSection from "./_components/about-features-section";
import AboutHowItWorksSection from "@/app/about/_components/about-how-it-works-section";
import AboutPersonalFeedSection from "@/app/about/_components/about-personal-feed-section";
import AboutCTASection from "@/app/about/_components/about-cta-section";

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
			<div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
				{/* Hero Section */}
				<AboutHero />

				{/* What is Podslice Section */}
				<AboutSection
					title="What is Podslice?"
					className="bg-gradient-to-br from-primary/5 via-background to-background"
				>
					<p className="text-lg md:text-xl text-foreground/80 leading-relaxed max-w-4xl mx-auto">
						Podslice uses advanced AI to turn any long-form content into a
						concise, high-quality{" "}
						<span className="font-semibold text-primary">
							summary, available in both audio and text
						</span>
						.
					</p>
					<p className="text-lg md:text-xl text-foreground/80 leading-relaxed max-w-4xl mx-auto mt-6">
						Instead of spending an hour watching a video, you can get all the
						essential takeaways in a 5-minute, AI-generated podcast episode or
						scan the key points, topics, and takeaways on a dedicated summary
						page. It's the perfect way to catch up on your interests during your
						commute, at the gym, or while making coffee.
					</p>
				</AboutSection>

				{/* How It Works Section */}
				<AboutSection title="How It Works (The AI Magic)" className="py-20">
					<AboutHowItWorksSection />
				</AboutSection>

				{/* Your Personal Feed Section */}
				<AboutSection
					title="Your Personal, Intelligent Feed"
					className="bg-gradient-to-br from-background via-primary/5 to-background"
				>
					<AboutPersonalFeedSection />
				</AboutSection>

				{/* Features Section */}
				<AboutSection title="Features at a Glance" className="py-20">
					<AboutFeaturesSection />
				</AboutSection>

				{/* Plans Section */}
				<AboutSection
					title="Find Your Perfect Plan"
					className="bg-gradient-to-br from-primary/5 via-background to-background"
				>
					<div className="max-w-4xl mx-auto">
						<p className="text-lg text-foreground/80 leading-relaxed text-center mb-12">
							Podslice has a plan for every type of listener.
						</p>
						<div className="space-y-6">
							{[
								{
									name: "Free Slice",
									description:
										"Get started for free and listen to our curated bundles.",
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
							].map((plan) => (
								<div
									key={plan.name}
									className="p-6 rounded-xl bg-bigcard border border-border/50 hover:border-primary/30 transition-all duration-300"
								>
									<h3 className="text-xl font-bold text-foreground mb-2">
										{plan.name}
									</h3>
									<p className="text-foreground/70">{plan.description}</p>
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

