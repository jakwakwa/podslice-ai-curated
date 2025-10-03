import type { Metadata } from "next";
import { ManagPlanLandingPage } from "@/components/manage-plan";
import { PageHeader } from "@/components/ui/page-header";

export const revalidate = 0;

export const metadata: Metadata = {
	title: "Subscription",
	description: "Manage your subscription",
};

export default function Page() {
	return (
		<div className=" w-full mx-auto py-8 px-2 md:px-4 mt-4">
			<PageHeader title="Manage Subscription" description="" level={1} spacing="default" />
			<ManagPlanLandingPage />
			{/* <Suspense fallback={<div>Loading…</div>}></Suspense> */}
		</div>
	);
}
