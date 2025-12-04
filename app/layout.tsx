import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import type React from "react";
import "./globals.css";

import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";

// Initialize fonts
const geist = Geist({
	subsets: ["latin"],
	weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
	variable: "--font-sans",
});
const geistMono = Geist_Mono({
	subsets: ["latin"],
	weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
	variable: "--font-mono",
});
const sourceSerif4 = Source_Serif_4({
	subsets: ["latin"],
	weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
	variable: "--font-serif",
});

export const metadata: Metadata = {
	title: "Podslice - Turn Information Overload Into Actionable Insight",
	description:
		"Your personal AI assistant that transforms content into short, insightful audio and text summaries. Filter out the noise and get just the key ideas.",
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
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={`${geist.variable} ${geistMono.variable} ${sourceSerif4.variable} font-sans antialiased`}>
				{children}
				<Analytics />
			</body>
		</html>
	);
}
