import type { Metadata } from "next";
import { Suspense } from "react";
import { SheetShowcase } from "./_components/SheetShowcase";

export const metadata: Metadata = {
	title: "Audio Player Sheet Demo",
	description: "Showcase of the AudioPlayerSheet UI for review",
};

import type { JSX } from "react";

export default function Page(): JSX.Element {
	return (
		<div className="p-6">
			<h1 className="mb-4 text-xl font-semibold">Audio Player Sheet Demo</h1>
			<p className="mb-6 text-sm opacity-80">Visual-only showcase of the new sheet UI.</p>
			<Suspense fallback={<div>Loading…</div>}>
				<SheetShowcase />
			</Suspense>
		</div>
	);
}
