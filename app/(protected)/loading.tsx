// import { SidebarProvider } from "@/components/ui/sidebar"
// import { SiteHeader } from "@/components/ui/site-header"
// CSS module migrated to Tailwind classes

import { AppSpinner } from "@/components/ui/app-spinner";

export default function Loading() {
	return (
		<div className="p-8 mx-auto">
			<div className="flex items-center justify-center min-h-[400px]">
				<AppSpinner variant={"wave"} size="lg" />
			</div>
		</div>
	);
}
