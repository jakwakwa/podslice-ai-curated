import { Suspense } from "react";
import { isAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";
import CronMonitorClient from "../_components/CronMonitorPanel.client";

export const dynamic = "force-dynamic";

export default async function AdminCronMonitorPage() {
	const admin = await isAdmin();
	if (!admin) {
		redirect("/");
	}

	return (
		<div className="container mx-auto p-6 max-w-6xl space-y-6">
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold">Cron Job Monitor</h1>
				<p className="text-muted-foreground">
					Monitor and manually trigger scheduled cron jobs. Perfect for testing before production deployment.
				</p>
			</div>
			<Suspense fallback={<div>Loading cron monitor…</div>}>
				<CronMonitorClient />
			</Suspense>
		</div>
	);
}

