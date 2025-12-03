import { Suspense } from "react";
import EmailManagementPanel from "../_components/EmailManagementPanel.server";

export const dynamic = "force-dynamic";

export default function EmailManagementPage() {
	return (
		<div className="container mx-auto p-6 max-w-6xl space-y-6">
			<h1 className="text-2xl font-semibold">Email Management</h1>
			<Suspense fallback={<div>Loading email management...</div>}>
				<EmailManagementPanel />
			</Suspense>
		</div>
	);
}
