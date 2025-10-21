import type React from "react";
import Link from "next/link";
import { LandingPageHeader } from "@/components/layout/LandingPageHeader";

interface LegalPageLayoutProps {
  children: React.ReactNode;
  pageTitle: string;
  lastUpdated: string;
}

const LegalPageLayout = ({
  children,
  pageTitle,
  lastUpdated,
}: LegalPageLayoutProps) => {
  return (
    <>
      <LandingPageHeader />
      <div className="container max-w-[98vw] sm:max-w-[90vw] mx-auto py-32 md:py-42 px-4 md:px-6 lg:px-8 md:max-w-[85vw] lg:max-w-[80vw] xl:max-w-[60vw]">
        <div className="text-foreground/90 mx-auto px-4 md:px-6">
          <div className="text-left mb-8 md:mb-12">
            <h1 className="text-4xl font-bold mb-4">{pageTitle}</h1>
            <p className="text-foreground/70">Last updated: {lastUpdated}</p>
          </div>
          {children}
        </div>
      </div>

      <footer className="w-screen hidden md:block fixed botton-0 text-right right-4 bottom-4 z-40">
        <div className="w-screen flex items-center space-x-2 text-muted-foreground">
          <Link
            href="/terms"
            className="hover:text-foreground transition-colors w-full text-[0.4rem]"
          >
            <span className="text-shadow-sm text-muted-foreground text-xs">
              Terms
            </span>
          </Link>
          <span>|</span>
          <Link
            href="/privacy"
            className="hover:text-foreground transition-colors text-[0.4rem]"
          >
            <span className="text-shadow-sm text-muted-foreground text-xs">
              Privacy
            </span>
          </Link>
        </div>
      </footer>
    </>
  );
};

export default LegalPageLayout;
