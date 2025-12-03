"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function AdminTabs() {
	const router = useRouter();
	const pathname = usePathname();
	const tabs = [
		{ href: "/admin/bundles", label: "Bundles" },
		{ href: "/admin/podcasts", label: "Podcasts" },
		{ href: "/admin/episodes", label: "Episodes" },
		{ href: "/admin/cron-monitor", label: "Cron Jobs" },
		{ href: "/admin/paddle-notifications", label: "Notifications" },
	];
	return (
		<div className="w-full border-b mt-6 border-border bg-[var(--beduk-1)] shadow-md shadow-black/80 p-2 rounded-md mb-4">
			<nav className="max-w-6xl mx-auto flex items-center gap-2 px-4">
				{tabs.map(tab => {
					const isActive = pathname === tab.href;
					return (
						<Button
							variant="outline"
							size="xs"
							key={tab.href}
							type="button"
							onClick={() => router.push(tab.href)}
							className={`text-sm px-3 py-2 rounded-md transition-colors ${isActive ? "bg-secondary text-accent-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"}`}>
							{tab.label}
						</Button>
					);
				})}
			</nav>
		</div>
	);
}
