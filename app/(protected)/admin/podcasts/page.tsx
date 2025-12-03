import { Suspense } from "react";
import PodcastsPanel from "../_components/PodcastsPanel.server";

export const dynamic = "force-dynamic";

export default function PodcastsPage() {
	return (
		<div className="container mx-auto max-w-6xl">
			<Suspense fallback={<div>Loading podcasts…</div>}>
				<PodcastsPanel />
			</Suspense>
		</div>
	);
}
