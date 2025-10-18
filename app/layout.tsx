import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Analytics } from "@vercel/analytics/react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type React from "react";
import { Toaster } from "sonner";
import { GlobalAudioPlayerSheet } from "@/components/ui/global-audio-player-sheet";
import { GlobalProgressBar } from "@/components/ui/global-progress-bar";
import { ClientProviders } from "./client-providers";

import "./globals.css";

const InterSans = Inter({ subsets: ["latin"] });

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
if (!clerkPublishableKey) {
	throw new Error("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not set");
}

export const metadata: Metadata = {
	title: "PODSLICE | AI Podcast Summaries | Cut the Chatter, Keep the Insight.",
	description: "Experience the future  of listening. PODSLICE crafts weekly AI summaries of top podcasts with a stunningly realistic voice. Get your intelligence briefing in minutes",
	openGraph: {
		title: "Cut the Chatter, Keep the Insight.",
		description: "Experience the future of listening. PODSLICE crafts weekly AI summaries of top podcasts with a stunningly realistic voice. Get your intelligence briefing in minutes",
		url: "https://podslice.ai",
		siteName: "PODSLICE AI",
		images: [{ url: "/podslice-og.jpg" }],
	},
	icons: {
		icon: "/assets/icon.svg",
	},
	twitter: {
		card: "summary_large_image",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<link rel="icon" href="/favicon.ico" sizes="32x32" />
				<link rel="icon" href="/icon.svg" type="image/svg+xml" />
				<link rel="apple-touch-icon" href="/apple-touch-icon.png" />

				<link rel="manifest" href="/manifest.json" />
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
				<link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Vend+Sans:wght@500&display=swap" rel="stylesheet" />
			</head>
			<body className={`${InterSans.className}`}>
				<GlobalProgressBar />
				<ClerkProvider
					publishableKey={clerkPublishableKey || ""}
					appearance={{
						baseTheme: [dark],
						variables: { colorPrimary: "rgb(122 178 237)", colorBackground: "#051D31D8", colorPrimaryForeground: "#95C2E4", colorForeground: "rgba(198 229 242 / 0.82)", colorInputForeground: "rgb(27 56 123)" },
						signIn: { variables: { colorPrimaryForeground: "#3f347d", colorForeground: "#9eb1c2", colorInputForeground: "rgb(174 162 231)", borderRadius: "2rem" } },
					}}>
					<ClientProviders>
						{children}
						<Toaster closeButton />
						<GlobalAudioPlayerSheet />
					</ClientProviders>
				</ClerkProvider>
				<Analytics />
			</body>
		</html>
	);
}
