"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";

interface BreadcrumbItem {
	label: string;
	href: string;
	isCurrentPage?: boolean;
}

// Route mapping for better breadcrumb labels
const routeLabels: Record<string, string> = {
	dashboard: "Dashboard",
	about: "About Podslice",
	episodes: "Weekly Episodes",
	"curated-bundles": "Bundles",
	"curation-profile-management": "Personal Feed",
	"notification-preferences": "Notifications",
	"user-subscription": "Subscription",
	admin: "Admin Panel",
	collections: "Collections",
};

export function useBreadcrumbs(): BreadcrumbItem[] {
	const pathname = usePathname();

	return useMemo(() => {
		// Handle null pathname case
		if (!pathname) return [];

		// Remove leading slash and split by '/'
		const segments = pathname.split("/").filter(Boolean);

		// Always include home/dashboard as the first item
		const breadcrumbs: BreadcrumbItem[] = [
			{
				label: "Dashboard",
				href: "/dashboard",
			},
		];

		// Build breadcrumbs from path segments
		let currentPath = "";

		segments.forEach((segment, index) => {
			currentPath += `/${segment}`;

			// Skip the first segment if it's the same as dashboard
			if (segment === "dashboard" || (segment === "protected" && index === 0)) {
				return;
			}

			const label =
				routeLabels[segment] ||
				segment.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
			const isCurrentPage = index === segments.length - 1;

			breadcrumbs.push({
				label,
				href: currentPath,
				isCurrentPage,
			});
		});

		// If we only have home, mark it as current page
		if (breadcrumbs.length === 1) {
			breadcrumbs[0]!.isCurrentPage = true;
		}

		return breadcrumbs;
	}, [pathname]);
}
