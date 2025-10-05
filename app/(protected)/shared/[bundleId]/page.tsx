import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SharedBundleView } from "./_components/shared-bundle-view";

export const dynamic = "force-dynamic";

interface PageProps {
	params: Promise<{ bundleId: string }>;
}

async function getBundleData(bundleId: string) {
	// Fetch from the public API route
	const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

	try {
		const response = await fetch(`${baseUrl}/api/public/shared-bundles/${bundleId}`, {
			cache: "no-store",
		});

		if (!response.ok) {
			return null;
		}

		return await response.json();
	} catch (error) {
		console.error("[FETCH_BUNDLE]", error);
		return null;
	}
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { bundleId } = await params;
	const bundle = await getBundleData(bundleId);

	if (!bundle) {
		return { title: "Bundle not found" };
	}

	return {
		title: bundle.name,
		description: bundle.description || `A shared episode bundle with ${bundle.total_episodes} episodes`,
	};
}

export default async function SharedBundlePage({ params }: PageProps) {
	const { bundleId } = await params;
	const { userId } = await auth();

	if (!userId) {
		notFound();
	}

	const bundle = await getBundleData(bundleId);

	if (!bundle) {
		notFound();
	}

	return <SharedBundleView bundle={bundle} bundleId={bundleId} />;
}
