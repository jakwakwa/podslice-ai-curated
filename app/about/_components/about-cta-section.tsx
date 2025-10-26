"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AboutCTASection() {
	return (
		<section className="py-20 px-4 bg-slate-950/50">
			<motion.div
				initial={{ opacity: 0, scale: 0.95 }}
				whileInView={{ opacity: 1, scale: 1 }}
				viewport={{ once: true }}
				transition={{ duration: 0.6 }}
				className="max-w-4xl mx-auto text-center p-12 shadow-2xl rounded-3xl bg-gradient-to-br from-secondary/10 via-secondary backdrop-blur-3xl to-background border border-secondary">
				<h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
					Ready to Get Started?
				</h2>
				<p className="text-lg md:text-xl text-foreground/70 mb-8 max-w-2xl mx-auto">
					Sign up for Podslice today and start turning information overload into
					actionable insight.
				</p>
				<Link href="/sign-up">
					<Button
						variant="default"
						size="lg"
						className="text-lg px-8 py-6 group hover:shadow-xl transition-all duration-300">
						Start Your Free Trial
						<ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
					</Button>
				</Link>
			</motion.div>
		</section>
	);
}
