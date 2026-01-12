"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getClerkSignInUrl } from "@/lib/env";
export function Header() {
	const [scrolled, setScrolled] = useState(false);

	useEffect(() => {
		// The scroll container is inside HeroCarousel, not the window
		const scrollContainer = document.querySelector(".h-screen.overflow-y-auto");

		const handleScroll = () => {
			if (scrollContainer) {
				setScrolled(scrollContainer.scrollTop > 50);
			}
		};

		if (scrollContainer) {
			scrollContainer.addEventListener("scroll", handleScroll);
			handleScroll();
		}

		return () => {
			if (scrollContainer) {
				scrollContainer.removeEventListener("scroll", handleScroll);
			}
		};
	}, []);

	return (
		<header
			className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
				scrolled ? "bg-white/90 backdrop-blur-md shadow-sm" : "bg-transparent"
			}`}>
			<div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Image src={"logo.svg"} width={130} height={200} alt="logo" />
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
				<Link href={getClerkSignInUrl()}>
					<Button
						variant="default"
						className="bg-emerald-500 text-white hover:bg-gray-100 rounded-full px-6">
						Log in
					</Button>
				</Link>
			</div>
		</header>
	);
}
