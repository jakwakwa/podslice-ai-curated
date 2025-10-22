"use client";
import Link from "next/link";

export function Footer() {
  return (
    <div className="bg-sidebar/50  px-4 py-14 mb-0 w-screen md:-ml-4 bottom-0 md:w-[102%] flex flex-col gap-4 md:py-12 items-center justify-center text-xs overflow-hidden rounded-none md:bg-bigcard opacity-90 ">
      <div className="flex items-center justify-center gap-2 text-sm text-secondary  w-full text-center">
        <Link
          href="/terms"
          className="hover:text-secondary-foreground transition-colors"
        >
          Terms of use
        </Link>
        <span>|</span>
        <Link
          href="/privacy"
          className="hover:text-secondary-foreground transition-colors"
        >
          Privacy Policy
        </Link>
        <span>|</span>
        <Link
          href="mailto:support@podslice.ai"
          className="hover:text-secondary-foreground transition-colors"
        >
          Need help?
        </Link>
      </div>
      <p>@{new Date().getFullYear()} PodSlice. All rights reserved.</p>
    </div>
  );
}
