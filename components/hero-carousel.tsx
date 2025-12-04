"use client";

import { useEffect, useRef, useState } from "react";
import { CTASection } from "./sections/cta-section";
import { FeaturesSection } from "./sections/features-section";
import { HeroSection } from "./sections/hero-section";
import { HowItWorksSection } from "./sections/how-it-works-section";
import { PersonalizedFeedSection } from "./sections/personalized-feed-section";
import { PricingSection } from "./sections/pricing-section";

const sections = [
	{ id: "hero", component: HeroSection },
	{ id: "how-it-works", component: HowItWorksSection },
	{ id: "personalized", component: PersonalizedFeedSection },
	{ id: "features", component: FeaturesSection },
	{ id: "pricing", component: PricingSection },
	{ id: "cta", component: CTASection },
];

export function HeroCarousel() {
	const [activeIndex, setActiveIndex] = useState(0);
	const [isScrolling, setIsScrolling] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const touchStartY = useRef(0);

	useEffect(() => {
		const handleWheel = (e: WheelEvent) => {
			if (isScrolling) return;

			const delta = e.deltaY;
			if (Math.abs(delta) < 30) return;

			e.preventDefault();
			setIsScrolling(true);

			if (delta > 0 && activeIndex < sections.length - 1) {
				setActiveIndex(prev => prev + 1);
			} else if (delta < 0 && activeIndex > 0) {
				setActiveIndex(prev => prev - 1);
			}

			setTimeout(() => setIsScrolling(false), 1000);
		};

		const handleTouchStart = (e: TouchEvent) => {
			const touch = e.touches[0];
			if (touch) {
				touchStartY.current = touch.clientY;
			}
		};

		const handleTouchEnd = (e: TouchEvent) => {
			if (isScrolling || e.changedTouches.length === 0) return;

			const touch = e.changedTouches[0];
			if (!touch) return;

			const touchEndY = touch.clientY;
			const delta = touchStartY.current - touchEndY;

			if (Math.abs(delta) < 50) return;

			setIsScrolling(true);

			if (delta > 0 && activeIndex < sections.length - 1) {
				setActiveIndex(prev => prev + 1);
			} else if (delta < 0 && activeIndex > 0) {
				setActiveIndex(prev => prev - 1);
			}

			setTimeout(() => setIsScrolling(false), 1000);
		};

		const handleKeyDown = (e: KeyboardEvent) => {
			if (isScrolling) return;

			if (e.key === "ArrowDown" && activeIndex < sections.length - 1) {
				e.preventDefault();
				setIsScrolling(true);
				setActiveIndex(prev => prev + 1);
				setTimeout(() => setIsScrolling(false), 1000);
			} else if (e.key === "ArrowUp" && activeIndex > 0) {
				e.preventDefault();
				setIsScrolling(true);
				setActiveIndex(prev => prev - 1);
				setTimeout(() => setIsScrolling(false), 1000);
			}
		};

		const container = containerRef.current;
		if (container) {
			container.addEventListener("wheel", handleWheel, { passive: false });
			container.addEventListener("touchstart", handleTouchStart);
			container.addEventListener("touchend", handleTouchEnd);
		}
		window.addEventListener("keydown", handleKeyDown);

		return () => {
			if (container) {
				container.removeEventListener("wheel", handleWheel);
				container.removeEventListener("touchstart", handleTouchStart);
				container.removeEventListener("touchend", handleTouchEnd);
			}
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [activeIndex, isScrolling]);

	return (
		<div ref={containerRef} className="h-screen overflow-hidden relative">
			<div
				className="transition-transform duration-1000 ease-[cubic-bezier(0.65,0,0.35,1)]"
				style={{ transform: `translateY(-${activeIndex * 100}vh)` }}>
				{sections.map(({ id, component: Component }, index) => (
					<section key={id} id={id} className="h-screen w-full">
						<Component isActive={index === activeIndex} />
					</section>
				))}
			</div>

			{/* Navigation dots */}
			<div className="fixed right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3">
				{sections.map((_, index) => (
					<button
						type="button"
						key={index}
						onClick={() => {
							if (!isScrolling) {
								setIsScrolling(true);
								setActiveIndex(index);
								setTimeout(() => setIsScrolling(false), 1000);
							}
						}}
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
