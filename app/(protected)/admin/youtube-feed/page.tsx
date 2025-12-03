import { redirect } from "next/navigation";
import { Suspense } from "react";
import { isAdmin } from "@/lib/admin";
import YoutubeFeedEntriesPanel from "../_components/YoutubeFeedEntriesPanel.server";

export const dynamic = "force-dynamic";

export default async function AdminYoutubeFeedPage() {
	const admin = await isAdmin();
	if (!admin) {
		redirect("/");
	}

	return (
		<div className="container mx-auto p-6 max-w-6xl space-y-6">
			<h1 className="text-2xl font-semibold">YouTube RSS Entries</h1>
			<Suspense fallback={<div>Loading entries…</div>}>
				<YoutubeFeedEntriesPanel />
			</Suspense>
		</div>
	);
}
