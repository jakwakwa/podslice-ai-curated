"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { BadgePlusIcon, CheckCircle } from "lucide-react";
import Link from "next/link";
import { Footer } from "@/app/(protected)/footer";
import LandingAudioPlayer from "@/components/demo/landing-audio-player";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { PRICING_TIER } from "@/config/paddle-config";
import styles from "@/styles/landing-page-content.module.css";
import { LandingPageHeader } from "../layout/LandingPageHeader";
import { Badge } from "../ui/badge";
import { Typography } from "../ui/typography";
import HomePageBackground from "./home-page-bg";

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
	const howItWorks = [
		{
			step: 1,
			title: "Choose Your Focus",
			description: "Define what matters to you in under 2 minutes.",
			action: "Start your profile",
		},
		{
			step: 2,
			title: "Free up your time",
			description:
				"Let our AI process your selections and extract the most valuable insights from each episode.",
			action: "AI processes content",
		},
		{
			step: 3,
			title: "Receive Weekly Insights",
			description:
				"Get your personalised, human-quality audio summary delivered every Friday—no hunting, no fluff, just pure value.",
			action: "Get your briefing",
		},
	];

	return (
		<div className="max-w-full w-screen md:w-full flex flex-col justify-center items-center content-center mx-auto px-8 md:px-0 pb-4 md:py-0  gap-0 mb-0 ">
			<HomePageBackground />
			<LandingPageHeader />

			<div className={`${styles.gridBackground} background-base`} />
			{/* Hero Section */}
			<section className={`${styles.heroSection} min-w-screen my-0 py-0  `}>
				<motion.div
					className={styles.heroBackground}
					style={{
						translateY: useTransform(useScroll().scrollY, [0, 500], [0, -150]),
					}}
				/>
				<div className={styles.heroContainer}>
					<div className={styles.heroContent}>
						<motion.h1
							className={styles.heroHeading}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.8, ease: "easeOut" }}>
							Cut the chatter.
							<br />
							<span className={styles.heroHeadingHighlight}>Keep the insight.</span>
						</motion.h1>
						<motion.p
							className={styles.heroDescription}
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}>
							Tired of sifting through hours of podcasts for that one golden nugget?
							Podslice.ai transforms chaotic audio into crystal-clear, actionable
							knowledge with remarkably human AI voices.
						</motion.p>
					</div>
					<motion.div
						className="flex flex-col sm:flex-row gap-4 justify-center items-center"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}>
						<Link href="/sign-in">
							<div>
								<div className={`${styles.heroBtn} text-amber-50 `}>Start Free Trial</div>
							</div>
						</Link>
					</motion.div>
					{/* Demo Audio Player */}
					<div className="mt-4 w-full max-w-screen md:max-w-3xl mx-auto md:px-4">
						<LandingAudioPlayer />
					</div>
				</div>
			</section>
			<div className="background-base bg-primary" />
			{/* How It Works Section */}
			<section className="overflow-hidden px-0 min-w-screen w-full md:h-full md:min-w-screen md:w-full md:px-4  bg-linear-to-b from-violet-950 to-violet-900 my-0 md:py-0 md:gap-0 md:mb-0 md:-mt-0">
				<div className="w-full max-w-screen md:min-w-7xl mx-auto md:px-12 px-0 py-8 md:py-24 mt-0 ">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true, margin: "-100px" }}
						transition={{ duration: 0.6 }}>
						<h2 className="text-left  sm:text-center text-primary-foreground font-bold px-4 mt-4 md:px-0 md:mt-18  text-3xl md:text-[3rem] text-shadow-lg text-shadow-[#445DB781]/60">
							How it Works
						</h2>

						<p className="w-full text-base md:text-center  md:mx-auto md:max-w-2xl  px-4 text-left pb-8 mt-4 sm:text-[1.4rem] my-8 leading-[1.4] text-primary-foreground-muted /90 text-shadow-sm  font-medium text-shadow-[#3684de0c]">
							Getting started with Podslice.ai is straightforward. Follow these four
							simple steps to create your focused content experience.
						</p>
					</motion.div>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-8 max-w-screen  w-screen min-w-full  px-0  mx-0  lg:max-w-6xl md:mx-auto">
						{howItWorks.map((step, index) => (
							<motion.div
								key={step.step}
								className="bg-default py-5 px-4 max-w-[89vw]  mx-auto flex   flex-col justify-center lg:mx-auto text-center p-0 rounded-[20px] border-2 border-light  bg-linear-to-br from-fuchsia-700/10 via-indigo-200/10 to-fuchsia-100/20  backdrop-blur-3xl border-violet-400/10 shadow-lg items-center "
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
								<div
									className="rounded-full align-center bg-azure-500/50 text-primary-foreground-muted  shadow-lg shadow-violet-950/10 
								 mb-3 inline-flex justify-center items-center w-10 h-10">
									{step.step}
								</div>
								<h3 className="text-lg font-bold text-secondary-foreground/80 text-shadow text-shadow-[#1C45DAE9]/10 text-shadow-lg">
									{step.title}
								</h3>
								<p className="w-full text-md leading-7 text-center my-6 mx-auto p-0 text-secondary-foreground/50 text-shadow-sm text-shadow-[#3684de0c]">
									{step.description}
								</p>
							</motion.div>
						))}
					</div>
				</div>
			</section>
			<section className="hidden my-12 px-4 md:my-32 w-screen md:w-full ">
				<div className="w-full max-w-screen md:max-w-7xl mx-auto px-8 md:px-0 py-4 md:py-0 bg-radial-gradient-secondary ">
					<div>
						<h2 className="text-left  sm:text-center text-[#5676e8] font-bold px-4 mt-4 md:px-0 md:mt-18  text-3xl md:text-[3rem]">
							Choose Your Plan
						</h2>
						<Typography className="max-w-full text-base text-left md:max-w-2xl mx-auto px-4 sm:text-center pb-8 mt-4 sm:text-[1.4rem] my-8 leading-[1.4] text-[#c1f0ff]/80">
							From free discovery to pro-level curation control. Each plan builds on the
							last to give you exactly what you need.
						</Typography>
					</div>
					<div className="  gap-2 md:gap-8 w-full mx-auto px-4 md:px-0 py-4 md:py-0 max-w-screen flex justify-between items-center">
						{SUBSCRIPTION_TIERS.map(tier => (
							<div
								key={tier.name}
								className={`transition-all w-full min-h-[800px] duration-200 ease-in-out relative h-full flex  border-[#29264d] border-1  flex-col px-8 py-4 rounded-3xl overflow-hidden max-w-screen md:max-w-5xl hover:-translate-y-1 hover:shadow-lg shadow-4x  ${tier.popular ? "bg-[#000] border-[#6750f8]/50 border-2 " : "bg-[#0d0d0f]"} `}>
								<div className="flex flex-col justify-start h-full min-h-[250px]">
									<div className="flex flex-col mt-4">
										<h5 className="text-3	xl font-bold tracking-normal  text-[#8f99f0] mb-2">
											{tier.name}
										</h5>
										<div className="flex items-baseline gap-1 mb-4">
											<p className="text-azure-100/40 font-bold">
												<span className=" text-[3rem] leading-9  tracking-tight text-primary-foreground-muted  ">
													<span className=" text-indigo-400 text-xl pr-1 font-medium">
														$
													</span>
													{tier.price}
												</span>
											</p>
											{tier.price !== 0 && (
												<span className="text-sm font-semibold text-indigo-300">
													/ month
												</span>
											)}
										</div>
										<p className="text-md text-foreground my-2 font-semibold leading-normal">
											{tier.description}
										</p>
									</div>
									{tier.popular && (
										<Badge
											variant="secondary"
											className=" bg-[rgba(59, 57, 61, 0.173)] p-0 border-light text-[#9bb5d4] h-16  px-4  text-left font-semibold border-primary/10 gap-3 rounded-none  shadow-xl w-full text-[0.8rem]">
											<BadgePlusIcon color="#7081e6" width={48} height={48} />
											Create your own Ai Generated Audio Summaries from any podcast show
										</Badge>
									)}
								</div>
								<CardContent className="flex flex-col flex-1 justify-between">
									<ul className="list-none p-0 m-0 mt-2">
										{tier.features.map((feature, index) => (
											<li
												key={index}
												className="flex content-center items-start gap-3 pb-3 text-foreground/60 text-sm font-light ">
												<CheckCircle
													size={16}
													className="text-amber flex-shrink-0 mt-[1px]"
													color={"#abf3f5"}
												/>
												{feature}
											</li>
										))}
									</ul>
									<Link href="/sign-in">
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

			<Footer />
		</div>
	);
}
