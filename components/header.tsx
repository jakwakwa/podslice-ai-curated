"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function Header() {
	const [scrolled, setScrolled] = useState(false);

	useEffect(() => {
		const handleScroll = () => {
			setScrolled(window.scrollY > 50);
		};
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	return (
		<header
			className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
				scrolled ? "bg-white/90 backdrop-blur-md shadow-sm" : "bg-transparent"
			}`}>
			<div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 rounded-full bg-linear-to-br from-pink-500 to-purple-600 flex items-center justify-center">
						<svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
							<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
						</svg>
					</div>
					<span
						className={`font-semibold text-lg transition-colors duration-500 ${scrolled ? "text-gray-900" : "text-white"}`}>
						Podslice
					</span>
				</div>
				<nav className="hidden md:flex items-center gap-8">
					<a
						href="#how-it-works"
						className={`text-sm font-medium transition-colors duration-500 hover:opacity-70 ${scrolled ? "text-gray-700" : "text-white/90"}`}>
						How It Works
					</a>
					<a
						href="#features"
						className={`text-sm font-medium transition-colors duration-500 hover:opacity-70 ${scrolled ? "text-gray-700" : "text-white/90"}`}>
						Features
					</a>
					<a
						href="#pricing"
						className={`text-sm font-medium transition-colors duration-500 hover:opacity-70 ${scrolled ? "text-gray-700" : "text-white/90"}`}>
						Pricing
					</a>
				</nav>
				<Button
					variant="default"
					className="bg-white text-gray-900 hover:bg-gray-100 rounded-full px-6">
					Get Started
				</Button>
			</div>
		</header>
	);
}
