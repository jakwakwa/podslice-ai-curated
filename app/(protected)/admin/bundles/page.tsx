import { Suspense } from "react";
import BundlesPanel from "../_components/BundlesPanel.server";

export const dynamic = "force-dynamic";

export default function BundlesPage() {
	return (
		<div className="container mx-auto md:max-w-6xl">
			<Suspense fallback={<div>Loading bundles…</div>}>
				<BundlesPanel />
			</Suspense>
		</div>
	);
}
