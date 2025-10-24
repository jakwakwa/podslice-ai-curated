import { ClerkProvider } from "@clerk/nextjs";
import { dark, shadesOfPurple } from "@clerk/themes";
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
	description:
		"PODSLICE is a platform for creating and sharing AI-generated summaries of podcasts. It is a platform for creating and sharing AI-generated summaries of podcasts.",
	keywords: ["PODSLICE", "AI Podcast Summaries", "Podcast Summaries", "Podcast Summarization", "Podcast Summarization AI", "Podcast Summarization Tool", "Podcast Summarization Service", "Podcast Summarization Platform", "Podcast Summarization Software", "Podcast Summarization App", "Podcast Summarization Tool", "Podcast Summarization Service", "Podcast Summarization Platform", "Podcast Summarization Software", "Podcast Summarization App", "Multi-source Up-to-date News Summaries", "Multi-source Up-to-date News Summarization", "Multi-source Up-to-date News Summarization AI", "Multi-source Up-to-date News Summarization Tool", "Multi-source Up-to-date News Summarization Service", "Multi-source Up-to-date News Summarization Platform", "Multi-source Up-to-date News Summarization Software", "Multi-source Up-to-date News Summarization App"],
	openGraph: {
		title: "PODSLICE | AI Podcast or Multi-source Up-to-date News Summaries | Cut the Chatter, Keep the Insight.",
		description:
			"Experience the future of listening. PODSLICE crafts weekly AI summaries of top podcasts with a stunningly realistic voice. Get your intelligence briefing in minutes",
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
				<link
					rel="preconnect"
					href="https://fonts.gstatic.com"
					crossOrigin=""
				/>
				<link
					href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Vend+Sans:wght@500&display=swap"
					rel="stylesheet"
				/>
			</head>
			<body className={`${InterSans.className}`}>
				<GlobalProgressBar />
				<ClerkProvider
					publishableKey={clerkPublishableKey || ""}
					appearance={{
						baseTheme: [dark, shadesOfPurple],
						variables: { colorPrimary: "aqua" },
						signIn: {
							baseTheme: [shadesOfPurple],
							variables: { colorPrimary: "lightseagreen" },
						},
						signUp: {
							baseTheme: [shadesOfPurple],
							variables: { colorPrimary: "lightseagreen" },
						},
					}}
				>
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
