"use client";

import { UilCheckCircle, UilClock, UilFile, UilPlay, UilSetting, UilStar } from "@iconscout/react-unicons";
import { motion, useScroll, useTransform } from "framer-motion";
import { BadgePlusIcon, CheckCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import LandingAudioPlayer from "@/components/demo/landing-audio-player";
import { Button } from "@/components/ui/button";
import { PRICING_TIER } from "@/config/paddle-config";
import { getClerkSignInUrl } from "@/lib/env";
import styles from "@/styles/landing-page-content.module.css";
import { LandingPageHeader } from "../layout/LandingPageHeader";
import { Badge } from "../ui/badge";
import { CardContent, CardHeader } from "../ui/card";
import { Typography } from "../ui/typography";

// Map PRICING_TIER to landing page format
const SUBSCRIPTION_TIERS = PRICING_TIER.map(tier => ({
	id: tier.planId.toLowerCase(),
	name: tier.productTitle,
	price: tier.planId === "FREE_SLICE" ? 0 : tier.planId === "CASUAL_LISTENER" ? 5 : 10,
	description: tier.description,
	features: tier.features,
	popular: tier.featured,
}));
const _curateText = `**Key Features & How They Benefit You:**

- **One Focused Bundle Per User:** To ensure the highest quality of your personalised episodes and to manage the significant costs associated with advanced AI processing (like ElevenReader), each user can now manage one primary collection at a time. This focus allows us to dedicate our resources to creating one truly exceptional weekly episode for you.
- **Effortless Show Selection:** We offer two intuitive ways for you to build your perfect collection:
    - **Editor's Choice Shows:** Our team handpicks a selection of approximately 25 high-quality podcast shows. You have the flexibility to choose up to 5 individual shows from this curated list to form your custom collection. Your interests can change, and so can your collection – you'll be able to easily add or remove shows at any time.
    - **Pre-curated Bundles:** For ultimate convenience, we've created three special "Editor's Choice" bundles. Each bundle is a thoughtfully assembled package of 5 shows centred around a specific theme (e.g., "Tech Weekly," "Business Insights," "Science & Discovery"). If you opt for a bundle, its contents are expertly chosen and fixed, meaning you can't edit the individual shows within it. These bundles will be refreshed monthly by our team to ensure the content remains relevant and exciting.
- **Automated Weekly Episodes – Delivered to You:** This is where the magic happens! Once your collection is set up, PodSlice will automatically generate a brand-new, single podcast episode for you every week. This process operates on a precise schedule, with a set cut-off time (e.g., every Friday at midnight). Our system will gather the latest content from your selected shows and intelligently summarise it into a cohesive, engaging episode.
- **Stay Informed with Smart Notifications:** You'll always know when your fresh episode is ready. We're implementing a robust notification system designed for your convenience:
    - **In-App Alerts:** A clear on-screen notification (like a bell icon) will appear within the app to let you know your new episode is waiting.
    - **Weekly Email Reminders:** A helpful email will be sent out weekly, reminding you about your newly generated podcast episode and encouraging you to listen.
    - **Personalised Preferences:** You'll have full control over your notification preferences in your account settings, allowing you to tailor how and when you receive updates.
- **Your Episodes, Always Accessible:** Should you decide to remove a collection, rest assured that any episodes previously generated from it will remain accessible in your "all podcast episodes" view. Your listening history is always preserved.`;


export default function LandingPageContent() {
	const _features = [
		{
			icon: <UilStar className="w-6 h-6" />,
			title: "Instantly grasp key takeaways in minutes, not hours",
			description:
				"Transform your overwhelm into clarity. No more struggling through lengthy episodes hoping to catch that one crucial insight. Our AI cuts straight to what matters, saving you 3-5 hours per week while ensuring you never miss the breakthrough moments that could change your perspective",
		},
		{
			icon: <UilPlay className="w-6 h-6" />,
			title: "Experience insights delivered in a remarkably human voice",
			description:
				"Forget robotic, artificial-sounding AI. Our advanced voice technology delivers summaries that feel like having a conversation with a knowledgeable friend—natural, engaging, and trustworthy. You'll actually want to listen, making every insight stick.",
		},
		{
			icon: <UilFile className="w-6 h-6" />,
			title: "Effortlessly search and review every word spoken",
			description:
				"Stop frantically taking notes or rewinding endlessly. Every key point is instantly searchable and reviewable. Find that specific quote, concept, or data point in seconds instead of scrubbing through audio files for minutes.",
		},
		{
			icon: <UilCheckCircle className="w-6 h-5" />,
			title: "Pinpoint the most critical information in seconds",
			description:
				"Cut through the noise to find what truly matters. Our intelligent extraction identifies the 3-5 most impactful insights from each episode, so you can immediately apply what you've learned instead of wondering what to do with scattered information.",
		},
		{
			icon: <UilSetting className="w-6 h-6" />,
			title: "Transform chaotic audio into crystal-clear knowledge",
			description:
				"Convert information overload into competitive advantage. Turn hours of scattered podcast listening into focused, purposeful learning that directly impacts your goals and decisions.",
		},
		{
			icon: <UilClock className="w-6 h-6" />,
			title: "Weekly Efficiency Delivered",
			description:
				"Fresh, focused episodes delivered every Friday - no more hunting through hours of content for the good parts. Get your personalized intelligence briefing and reclaim your weekend.",
		},
	];

	const howItWorks = [
		{
			step: 1,
			title: "Choose Your Focus",
			description: "Select from expertly Podslice.ai Bundles or pick your favorite shows. Define what matters to you in under 2 minutes.",
			action: "Start your profile",
		},
		{
			step: 2,
			title: "Let AI Work",
			description: "Our intelligent system processes your selections and extracts only the most valuable insights from each episode.",
			action: "AI processes content",
		},
		{
			step: 3,
			title: "Receive Weekly Insights",
			description: "Get your personalized, human-quality audio summary delivered every Friday—no hunting, no fluff, just pure value.",
			action: "Get your briefing",
		},
	];

	return (
		<div className={styles.container}>
			{/* <HomePageBackground /> */}
			<LandingPageHeader />
			{/* Hero Section */}
			<section className={styles.heroSection}>
				<motion.div
					className={styles.heroBackground}
					style={{
						translateY: useTransform(useScroll().scrollY, [0, 500], [0, -150]),
					}}
				/>
				<div className={styles.heroContainer}>
					{/* <div className={"grain-blur background-base left-50 top-70"} /> */}
					{/* <div className={"grain-background background-base"} /> */}
					{/* <div className={"grid-bg background-base"} /> */}
					{/* <div className={"large-blur background-base"} /> */}
					{/* <div className={"small-blur background-base top-50"} /> */}
					<div className={styles.heroContent}>
						<motion.h1 className={styles.heroHeading} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}>
							Cut the chatter.
							<br />
							<span className={styles.heroHeadingHighlight}>Keep the insight.</span>
						</motion.h1>
						<motion.p className={styles.heroDescription} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}>
							Tired of sifting through hours of podcasts for that one golden nugget? Podslice.ai transforms chaotic audio into crystal-clear, actionable knowledge with remarkably human AI voices.
						</motion.p>
					</div>
					<motion.div
						className="flex flex-col sm:flex-row gap-4 justify-center items-center"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}>
						<Link href="/sign-up">
							<div>
								<div className={styles.heroBtn}>Start Free Trial</div>
							</div>
						</Link>
					</motion.div>
					{/* Demo Audio Player */}
					<div className="mt-4 w-full max-w-screen md:max-w-3xl mx-auto md:px-4">
						<LandingAudioPlayer />
					</div>
				</div>
			</section>

			{/* How It Works Section */}
			<section className="my-12  w-full px-4 md:my-32">
				<div className={styles.howItWorksContainer}>
					<motion.div className={styles.howItWorksHeader} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6 }}>
						<h2 className="text-left  sm:text-center text-[#919ceb] font-bold px-4 mt-4 md:px-0 md:mt-18  text-3xl md:text-[3rem]">How it Works</h2>

						<Typography className="max-w-full text-base text-left md:max-w-2xl mx-auto px-4 sm:text-center pb-8 mt-4 sm:text-[1.4rem] my-8 leading-[1.4] text-[#c1f0ff]/80">
							Getting started with Podslice.ai is straightforward. Follow these four simple steps to create your focused content experience.
						</Typography>
					</motion.div>
					<div className={styles.howItWorksGrid}>
						{howItWorks.map((step, index) => (
							<motion.div
								key={step.step}
								className="bg-default py-5 px-4 flex flex-col justify-center p-0 rounded-[20px] border-2 border-light shadow-lg items-center "
								initial={{ opacity: 0, y: 30, scale: 0.95 }}
								whileInView={{ opacity: 1, y: 0, scale: 1 }}
								viewport={{ once: true, margin: "-100px" }}
								transition={{
									duration: 0.5,
									ease: "easeOut",
									delay: index * 0.15,
								}}
								whileHover={{
									y: -5,
									scale: 1.02,
									transition: { duration: 0.2 },
								}}>
								<div className="rounded-full align-center font-bold text-[#fff] bg-[#A35DC4]/50 mb-3 inline-flex justify-center items-center w-10 h-10">{step.step}</div>
								<h3 className="text-xl font-bold text-popover-foreground">{step.title}</h3>
								<p className="text-md leading-7 text-center my-6 w-full p-0">{step.description}</p>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			{/* Pricing Section */}
			<section className="my-12 w-full px-4 md:my-32">
				<div className={styles.pricingContainer}>
					<div>
						<h2 className="text-left  sm:text-center text-[#5676e8] font-bold px-4 mt-4 md:px-0 md:mt-18  text-3xl md:text-[3rem]">Choose Your Plan</h2>
						<Typography className="max-w-full text-base text-left md:max-w-2xl mx-auto px-4 sm:text-center pb-8 mt-4 sm:text-[1.4rem] my-8 leading-[1.4] text-[#c1f0ff]/80">
							From free discovery to pro-level curation control. Each plan builds on the last to give you exactly what you need.
						</Typography>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-2 w-full mx-auto px-4 md:px-0">
						{SUBSCRIPTION_TIERS.map(tier => (
							<div
								key={tier.name}
								className={`transition-all duration-200 ease-in-out relative h-full flex  border-[#29264d] border-1  flex-col px-8 py-4 rounded-3xl overflow-hidden max-w-screen md:max-w-5xl hover:-translate-y-1 hover:shadow-lg shadow-4x  ${tier.popular ? "bg-[#000] border-[#6750f8]/50 border-2 " : "bg-[#0d0d0f]"} `}>
								<CardHeader>
									<div className="flex flex-col mt-4">
										<h5 className="text-3	xl font-bold tracking-normal  text-[#8f99f0] mb-2">{tier.name}</h5>
										<div className="flex items-baseline gap-1 mb-4">
											<p className="text-teal-100/40 font-bold">
												<span className="text-indigo-500 text-[3rem] leading-9  tracking-tight font-black ">
													<span className=" text-indigo-400 text-xl pr-1 font-medium">$</span>
													{tier.price}
												</span>
											</p>
											{tier.price !== 0 && <span className="text-sm text-foreground font-semibold text-indigo-300">/ month</span>}
										</div>
										<p className="text-md text-foreground my-2 font-semibold leading-normal">{tier.description}</p>
									</div>
									{tier.popular && (
										<Badge
											variant="secondary"
											className=" bg-[rgba(59, 57, 61, 0.173)] p-0 border-light text-[#9bb5d4] h-16  px-4  text-left font-semibold border-primary/10 gap-3 rounded-none  shadow-xl w-full text-[0.8rem]">
											<BadgePlusIcon color="#7081e6" width={48} height={48} />
											Create your own Ai Generated Audio Summaries from any podcast show
										</Badge>
									)}
								</CardHeader>
								<CardContent className="flex flex-col flex-1 justify-start">
									<ul className="list-none p-0 m-0 mt-2">
										{tier.features.map((feature, index) => (
											<li key={index} className="flex content-center items-start gap-3 pb-3 text-foreground/60 text-xs font-light ">
												<CheckCircle size={16} className="text-amber flex-shrink-0 mt-[1px]" color={"#abf3f5"} />
												{feature}
											</li>
										))}
									</ul>
									<Link href="/sign-up">
										<Button
											className={`w-full flex items-center justify-center gap-2 mt-auto ${tier.popular ? " text-accent-foreground hover:bg-radial-gradient-secondary/80 transition-all duration-200 ease-in-out h-10" : "h-10"}`}
											variant={tier.popular ? "default" : "default"}
											size="lg">
											{tier.id === "free_slice" ? "Start Free Trial" : "Subscribe Today"}
										</Button>
									</Link>
								</CardContent>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="py-8 md:py-12 px-2 md:px-4 bg-radial-gradient mt-24">
				<motion.div className="max-w-screen md:max-w-7xl mx-auto text-center" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
					<div className="flex justify-center items-center mb-4">
						<Image src="/logo.svg" width={90} height={40} alt="PODSLICE Logo" />
					</div>
					<div className="flex justify-center items-center space-x-6 text-sm text-foreground/70">
						<Link href="/sign-up" className="hover:text-foreground transition-colors">
							Sign Up
						</Link>
						<Link href={getClerkSignInUrl()} className="hover:text-foreground transition-colors">
							Log in
						</Link>
						<Link href="/terms" className="hover:text-foreground transition-colors">
							Terms
						</Link>
						<Link href="/privacy" className="hover:text-foreground transition-colors">
							Privacy
						</Link>
					</div>
				</motion.div>
			</footer>
		</div>
	);
}
