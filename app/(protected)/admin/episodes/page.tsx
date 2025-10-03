import { Suspense } from "react";
import EpisodeGenerationPanel from "../_components/EpisodeGenerationPanel.server";

export const dynamic = "force-dynamic";

export default function EpisodesAdminPage() {
	return (
		<div className=" mx-auto w-full">
			<h1 className="text-2xl font-semibold">Episode Generation</h1>
			<Suspense fallback={<div>Loading episodes…</div>}>
				<EpisodeGenerationPanel />
			</Suspense>
		</div>
	);
}
