import type { Metadata } from "next";
import { ManagPlanLandingPage } from "@/components/manage-plan";

export const revalidate = 0;

export const metadata: Metadata = {
	title: "Subscription",
	description: "Manage your subscription",
};

export default function Page() {
	return (
		<div className=" w-full mx-auto py-8 px-2 md:px-4 mt-4">
			<h2 className="flex flex-col w-full text-lg xl:text-2xl md:text-xl   lg:text-2xl font-bold  md:px-0 pt-0 px-4 pb-0 md:py-0  text-primary-foreground leading-normal lg:max-w-xl lg:py-0 title-case ">
				Manage Subscription
			</h2>
			<ManagPlanLandingPage />
		</div>
	);
}
