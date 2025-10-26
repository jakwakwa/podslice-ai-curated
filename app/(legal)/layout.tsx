import type { Metadata } from "next";
import type React from "react";
import "@/app/globals.css";

export const metadata: Metadata = {
    title: "PODSLICE | Terms of Service & Privacy Policy",
    description:
        "PODSLICE is a platform for creating and sharing AI-generated summaries of podcasts. It is a platform for creating and sharing AI-generated summaries of podcasts.",
    keywords: ["PODSLICE", "Terms of Service", "Privacy Policy"],
    openGraph: {
        title: "PODSLICE | Terms of Service & Privacy Policy",
        description:
            "PODSLICE is a platform for creating and sharing AI-generated summaries of podcasts. It is a platform for creating and sharing AI-generated summaries of podcasts.",
        url: "https://podslice.ai/terms",
        siteName: "PODSLICE AI",
        images: [{ url: "/podslice-og.jpg" }],
    }
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    // Important: this segment layout must be a THIN wrapper that relies on the root layout
    // for <html>, <body>, providers, and theme handling to avoid hydration issues.
    return children;
}
