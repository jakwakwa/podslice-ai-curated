"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface SectionProps {
	isActive: boolean;
}

export function CTASection({ isActive }: SectionProps) {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		if (isActive) {
			setMounted(false);
			const timer = setTimeout(() => setMounted(true), 100);
			return () => clearTimeout(timer);
		}
	}, [isActive]);

	return (
		<div className="relative h-full w-full bg-linear-to-br from-purple-600 via-purple-600 to-emerald-500 overflow-hidden">
			{/* Animated background elements */}
			<div className="absolute inset-0">
				<div
					className={`absolute w-[800px] h-[800px] rounded-full bg-white/10 -top-1/2 left-1/2 -translate-x-1/2 transition-all duration-2000 ease-out ${
						mounted ? "scale-100 opacity-100" : "scale-50 opacity-0"
					}`}
				/>
				<div
					className={`absolute w-[600px] h-[600px] rounded-full bg-white/5 bottom-0 -right-40 transition-all duration-2000 ease-out ${
						mounted ? "scale-100 opacity-100" : "scale-50 opacity-0"
					}`}
					style={{ transitionDelay: "300ms" }}
				/>
			</div>

			<div className="relative z-10 h-full flex flex-col items-center justify-center px-6 text-center">
				<h2
					className={`text-4xl md:text-5xl lg:text-7xl font-semibold text-white max-w-4xl leading-tight text-balance transition-all duration-1000 ${
						mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
					}`}>
					Ready to Get Started?
				</h2>

				<p
					className={`mt-6 text-xl text-white/90 max-w-2xl transition-all duration-1000 ${
						mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
					}`}
					style={{ transitionDelay: "200ms" }}>
					Sign up for Podslice today and start turning information overload into
					actionable insight.
				</p>

				<div
					className={`mt-10 transition-all duration-1000 ${
						mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
					}`}
					style={{ transitionDelay: "400ms" }}>
					<Button
						variant="default"
						size="lg"
						className="bg-white hover:bg-gray-100 rounded-full px-10 py-6 text-lg font-semibold shadow-2xl hover:scale-105 transition-transform">
						<Link href="/sign-in" className="text-white">
							Start Your Free Trial
						</Link>
					</Button>
				</div>

				<p
					className={`mt-6 text-white/60 text-sm transition-all duration-1000 ${mounted ? "opacity-100" : "opacity-0"}`}
					style={{ transitionDelay: "600ms" }}>
					PayPal, Google Pay, Apple Pay, Credit Card available
				</p>
			</div>
		</div>
	);
}
