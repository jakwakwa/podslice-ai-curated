import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getClerkSignInUrl } from "@/lib/env";
import styles from "@/styles/landing-page-content.module.css";

export function LandingPageHeader() {
	return (
		<header className="w-full   z-50 ">
			<div className="w-full flex justify-between items-center fixed h-[80px] z-50 max-w-screen mx-auto bg-gray-900/80 px-8 md:px-24 py-4 md:py-0 ">
				<Link href="/">
					<Image src="/logo.svg" width={100} height={60} alt="PODSLICE Logo" className={styles.landingLogo} />
				</Link>
				<nav className={styles.landingNav}>
					<Link href={getClerkSignInUrl()}>
						<Button variant="default" size="md" className="text-[0.9rem] px-5 font-bold">
							Log in
						</Button>
					</Link>
				</nav>
			</div>
		</header>
	);
}
