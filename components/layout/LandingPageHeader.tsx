"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getClerkSignInUrl } from "@/lib/env";
import styles from "@/styles/landing-page-content.module.css";

export function LandingPageHeader() {
	const [isScrolled, setIsScrolled] = useState(false);

	useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 20);
		};

		window.addEventListener("scroll", handleScroll);
		handleScroll();

		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	return (
		<div
			className={`${styles.landingHeaderContainer} transition-all duration-300 ${
				isScrolled
					? "bg-[#1f1d28] shadow-lg backdrop-blur-sm"
					: "bg-transparent shadow-none"
			}`}>
			<header className="flex flex-row w-full justify-between items-center h-[70px] px-8 md:px-0 md:max-w-[90vw]  mx-auto">
				<Link href="/">
					<Image
						src="/logo.svg"
						width={100}
						height={60}
						alt="PODSLICE Logo"
						className={styles.landingLogo}
					/>
				</Link>
				<nav className={styles.landingNav}>
					<div className="flex items-center gap-6">
						{/*<Link
                            href="/about"
                            className="text-foreground/70 hover:text-foreground transition-colors font-medium"
                        >
                            About
                        </Link>*/}
						<Link href={getClerkSignInUrl()}>
							<Button
								variant="default"
								size="default"
								className="text-[0.9rem] px-5 font-bold">
								Log ins
							</Button>
						</Link>
					</div>
				</nav>
			</header>
		</div>
	);
}
