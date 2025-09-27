"use client";

import { useUser } from "@clerk/nextjs";
import { Home, Info, Play, Radio } from "lucide-react";
import type * as React from "react";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { Sidebar, SidebarContent, SidebarFooter } from "@/components/ui/sidebar";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const { user } = useUser();

	// Prepare user data for NavUser component
	const userData = {
		name: user?.fullName || user?.firstName || "User",
		email: user?.emailAddresses?.[0]?.emailAddress || "user@example.com",
		avatar: user?.imageUrl || "/placeholder-user.jpg",
	};

	// Navigation items
	const navItems = [
		{
			title: "Dashboard",
			url: "/dashboard",
			icon: Home,
		},
		{
			title: "Generate Custom Episodes",
			url: "/generate-my-episodes",
			icon: Info,
		},

		{
			title: "Bundle Episodes",
			url: "/episodes",
			icon: Play,
		},
		{
			title: "My Episodes",
			url: "/my-episodes",
			icon: Play,
		},
		{
			title: "Explore Curated Bundles",
			url: "/curated-bundles",
			icon: Radio,
		},
		// {
		// 	title: "Notifications",
		// 	url: "/notifications",
		// 	icon: Bell,
		// 	separator: true,
		// },
		{
			title: "About Podslice",
			url: "/welcome",
			icon: Info,
			separator: true,
		},
	];

	return (
		<Sidebar collapsible="offcanvas" {...props} className="border-1 border-l-0 border-b-0 border-r-[#a6d0e524] ">
			<SidebarContent>
				<NavMain items={navItems} />
			</SidebarContent>
			<SidebarFooter>
				<NavUser user={userData} />
			</SidebarFooter>
		</Sidebar>
	);
}
