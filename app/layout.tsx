import { ClerkProvider } from "@clerk/nextjs";
import { dark, shadesOfPurple } from "@clerk/themes";
import { Analytics } from "@vercel/analytics/react";
import type { Metadata } from "next";
import type React from "react";
import { Toaster } from "sonner";
import { GlobalAudioPlayerSheet } from "@/components/ui/global-audio-player-sheet";
import { GlobalProgressBar } from "@/components/ui/global-progress-bar";
import { getAppUrl } from "@/lib/env";
import { ClientProviders } from "./client-providers";
import "./globals.css";

import { Geist_Mono, Inria_Serif, Poppins } from "next/font/google";

// Initialize fonts
const geist = Poppins({
	subsets: ["latin"],
	weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
	variable: "--font-sans",
});
const geistMono = Geist_Mono({
	subsets: ["latin"],
	weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
	variable: "--font-mono",
});
const sourceSerif4 = Inria_Serif({
	subsets: ["latin"],
	weight: ["300", "400", "700"],
	variable: "--font-serif",
});

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
if (!clerkPublishableKey) {
	throw new Error("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not set");
}

export const metadata: Metadata = {
	title: "Podslice - Institutional Intelligence for the Modern Portfolio",
	description:
		"Move beyond simple summaries. Podslice extracts actionable signals, ticker sentiment, and has a built in lie detector at your service for insights from hours of audio and research documents in seconds",
	generator: "v0.app",
	icons: {
		icon: [
			{
				url: "/icon-light-32x32.png",
				media: "(prefers-color-scheme: light)",
			},
			{
				url: "/icon-dark-32x32.png",
				media: "(prefers-color-scheme: dark)",
			},
			{
				url: "/icon.svg",
				type: "image/svg+xml",
			},
		],
		apple: "/apple-icon.png",
	},
	metadataBase: new URL(getAppUrl() || "http://localhost:3000"),
	openGraph: {
		siteName: "Podslice",
		type: "website",
		locale: "en_US",
	},
	twitter: {
		card: "summary_large_image",
		title: "Podslice", // Fallback
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				suppressHydrationWarning
				className={`${geist.variable} ${geistMono.variable} ${sourceSerif4.variable} font-sans antialiased`}>
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
