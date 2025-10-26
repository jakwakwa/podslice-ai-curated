"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface AboutFeatureCardProps {
	icon: LucideIcon;
	title: string;
	description: string;
}

export default function AboutFeatureCard({
	icon: Icon,
	title,
	description,
}: AboutFeatureCardProps) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true }}
			transition={{ duration: 0.5 }}
			className="p-6 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg group"
		>
			<div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
				<Icon className="w-6 h-6 text-primary" />
			</div>
			<h3 className="text-xl font-bold text-foreground mb-3">{title}</h3>
			<p className="text-foreground/70 leading-relaxed">{description}</p>
		</motion.div>
	);
}

