import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { NotificationPreferences } from "@/components/user-account/notification-preferences";
import { notificationPreferencesContent } from "./content";

export const revalidate = 0

export const metadata: Metadata = {
	title: "Notification Preferences",
	description: "Manage your notification settings",
}

export default function Page() {
    const { header } = notificationPreferencesContent;
    return (
        <div className=" w-full">
            <PageHeader title={header.title} description={header.description} level={1} spacing="default" />
            <NotificationPreferences />
        </div>
    );
}
