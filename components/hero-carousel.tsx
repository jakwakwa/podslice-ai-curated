"use client";

import { useRef, useState } from "react";
import { CTASection } from "./sections/cta-section";
import { FeaturesSection } from "./sections/features-section";
import { Hetealction } from "./sections/hero-section";
import { HowItWorksSection } from "./sections/how-it-works-section";
import { PersonalizedFeedSection } from "./sections/personalized-feed-section";
import { PricingSection } from "./sections/pricing-section";

const sections = [
	{ id: "hero", component: Hetealction },
	{ id: "how-it-works", component: HowItWorksSection },
	{ id: "personalized", component: PersonalizedFeedSection },
	{ id: "features", component: FeaturesSection },
	{ id: "pricing", component: PricingSection },
	{ id: "cta", component: CTASection },
];

export function HeroCarousel() {
	const [activeIndex, setActiveIndex] = useState(0);
	const containerRef = useRef<HTMLDivElement>(null);

	const handleScroll = () => {
		if (containerRef.current) {
			const scrollTop = containerRef.current.scrollTop;
			const clientHeight = containerRef.current.clientHeight;
			const index = Math.round(scrollTop / clientHeight);
			setActiveIndex(index);
		}
	};

	const scrollToSection = (index: number) => {
		if (containerRef.current) {
			const clientHeight = containerRef.current.clientHeight;
			containerRef.current.scrollTo({
				top: index * clientHeight,
				behavior: "smooth",
			});
		}
	};

	return (
		<div
			ref={containerRef}
			onScroll={handleScroll}
			className="h-screen w-full overflow-y-auto scroll-smooth no-scrollbar">
			{sections.map(({ id, component: Component }, index) => (
				<section key={id} id={id} className="h-screen w-full shrink-0">
					<Component isActive={index === activeIndex} />
				</section>
			))}

			{/* Navigation dots */}
			<div className="fixed right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3">
				{sections.map((_, index) => (
					<button
						type="button"
						key={index}
						onClick={() => scrollToSection(index)}
						className={`w-2 h-2 rounded-full transition-all duration-500 ${
							index === activeIndex
								? "bg-white scale-150 shadow-lg"
								: "bg-white/40 hover:bg-white/60"
						}`}
						aria-label={`Go to section ${index + 1}`}
					/>
				))}
			</div>
		</div>
	);
}
