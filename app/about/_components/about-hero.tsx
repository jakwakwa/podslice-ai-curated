"use client";

import { motion } from "framer-motion";

export default function AboutHero() {
	return (
		<section className="relative overflow-hidden pt-42 pb-34 px-4">
			{/* Gradient Background */}
			<div className="absolute inset-0 bg-gradient-to-tr from-0% from-black  via-100% via-[var(--chart-1)] to-[var(--chart-5)] to-240%" />

			<div className="relative max-w-5xl mx-auto text-center">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8 }}>
					<h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6">
						<span className="bg-gradient-to-r from-primary-foreground-muted via-sidebar-[var(--beduk-5)] to-[var(--beduk-5)] bg-clip-text text-transparent">
							What is Podslice?
						</span>
					</h1>
				</motion.div>

				<motion.p
					className="text-lg md:text-xl lg:text-2xl text-primary-foreground max-w-3xl mx-auto mb-8"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8, delay: 0.2 }}>
					Feeling overwhelmed by endless articles, too many great longform podcasts, and
					news feeds you can't keep up with?
				</motion.p>

				<motion.p
					className="text-base md:text-lg text-secondary-foreground max-w-3xl mx-auto"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8, delay: 0.4 }}>
					Podslice is your personal AI assistant that transforms the world's content into
					short, insightful{" "}
					<span className="font-semibold text-primary-foreground-muted">
						audio and text summaries
					</span>
					. We filter out the noise and deliver just the key ideas in two powerful
					formats: a clean, listenable podcast and a detailed, structured text summary.
					You stay smart and informed, all while saving hours of your valuable time.
				</motion.p>
			</div>
		</section>
	);
}
