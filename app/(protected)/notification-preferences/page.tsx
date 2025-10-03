import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { NotificationPreferences } from "@/components/user-account/notification-preferences";

export const revalidate = 0;

export const metadata: Metadata = {
	title: "Notification Preferences",
	description: "Manage your notification settings",
};

export default function Page() {
	return (
		<div className=" w-full">
			{/* MAIN CONTAINER */}

			<PageHeader title=" Notification Preferences" description="Notification options for your episodes, selected bundles, feeds etc." level={1} spacing="default" />
			<NotificationPreferences />
		</div>
	);
}
