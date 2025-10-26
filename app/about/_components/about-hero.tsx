"use client";

import { motion } from "framer-motion";

export default function AboutHero() {
	return (
		<section className="relative overflow-hidden pt-32 pb-20 px-4">
			{/* Gradient Background */}
			<div className="absolute inset-1 bg-gradient-to-b from-black/60 via-[var(--chart-2)]/30 to-[var(--chart-1)]" />

			<div className="relative max-w-5xl mx-auto text-center">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8 }}
				>
					<h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6">
						Cut the Chatter.
						<br />
						<span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
							Keep the Insight.
						</span>
					</h1>
				</motion.div>

				<motion.p
					className="text-lg md:text-xl lg:text-2xl text-foreground/70 max-w-3xl mx-auto mb-8"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8, delay: 0.2 }}
				>
					Feeling overwhelmed by endless YouTube videos, long-winded podcasts,
					and news feeds you can't keep up with?
				</motion.p>

				<motion.p
					className="text-base md:text-lg text-foreground/60 max-w-3xl mx-auto"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8, delay: 0.4 }}
				>
					Podslice is your personal AI assistant that transforms the world's
					content into short, insightful{" "}
					<span className="font-semibold text-primary">
						audio and text summaries
					</span>
					. We filter out the noise and deliver just the key ideas in two
					powerful formats: a clean, listenable podcast and a detailed,
					structured text summary. You stay smart and informed, all while saving
					hours of your valuable time.
				</motion.p>
			</div>
		</section>
	);
}

