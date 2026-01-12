"use client";
import Link from "next/link";

export function Footer() {
	return (
		<div className="bg-sidebar  px-4 py-1 mb-0 w-screen md:-ml-4 bottom-0 md:w-full flex flex-col  md:py-4 m-0 gap-0 items-center justify-evenly text-xs overflow-hidden rounded-none min-h-[110px] ">
			<div className="flex items-center justify-center gap-2 text-sm text-secondary  w-full text-center">
				<Link href="/about" className="hover:text-secondary-foreground transition-colors">
					About
				</Link>
				<span>|</span>
				<Link href="/terms" className="hover:text-secondary-foreground transition-colors">
					Terms of use
				</Link>
				<span>|</span>
				<Link
					href="/privacy"
					className="hover:text-secondary-foreground transition-colors">
					Privacy Policy
				</Link>
				<span>|</span>
				<Link
					href="mailto:support@podslice.ai"
					className="hover:text-secondary-foreground transition-colors">
					Need help?
				</Link>
			</div>
			<p>@{new Date().getFullYear()} PodSlice. All rights reserved.</p>
		</div>
	);
}
