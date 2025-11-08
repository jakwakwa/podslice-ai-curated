import { Suspense } from "react";
import PaddleNotificationsPanel from "../_components/PaddleNotificationsPanel.server";

export const dynamic = "force-dynamic";

export default function PaddleNotificationsPage() {
	return (
		<div className="container mx-auto p-6 max-w-6xl space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Paddle Notification Destinations</h1>
				<p className="text-sm text-muted-foreground mt-1">
					Manage webhook endpoints and email destinations for Paddle events
				</p>
			</div>
			<Suspense fallback={<div>Loading notification settings...</div>}>
				{/* @ts-expect-error Async Server Component */}
				<PaddleNotificationsPanel />
			</Suspense>
		</div>
	);
}
