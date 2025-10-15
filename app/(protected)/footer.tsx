"use client";
import Link from "next/link";


export function Footer() {
	return (
		<div className="flex flex-col gap-4 mt-8 items-center justify-center bg-background py-4 text-xs">
			<div className="flex items-center justify-center gap-2 text-sm text-muted-foreground  w-full text-center" >
				<Link href="/terms">Terms of use</Link>
				<span>|</span>
				<Link href="/privacy">Privacy Policy</Link>
				<span>|</span>
				<Link href="mailto:support@podslice.ai">Need help?</Link>


			</div>
			<p>@{new Date().getFullYear()} PodSlice. All rights reserved.</p>

		</div>
	);
}
