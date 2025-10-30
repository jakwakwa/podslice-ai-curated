"use client";

import { useUser } from "@clerk/nextjs";
import { BoxesIcon, Home, PlayCircleIcon, Radio, WandSparkles } from "lucide-react";
import type * as React from "react";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { Sidebar, SidebarContent, SidebarFooter } from "@/components/ui/sidebar";

export const navItems = [
	{
		title: "Your Dashboard",
		url: "/dashboard",
		icon: Home,
	},
	{
		title: "Discover Feeds",
		url: "/curated-bundles",
		icon: Radio,
	},
	{
		title: "Channel Feeds",
		url: "/episodes",
		icon: BoxesIcon,
	},
	{
		title: "Create with AI",
		url: "#",
		icon: WandSparkles,
		hasSubitems: true,
		subItems: [
			{
				name: "Create",
				url: "/generate-my-episodes",
				icon: WandSparkles,
			},
			{
				name: "Your Stuff",
				url: "/my-episodes",
				icon: PlayCircleIcon,
			},
		],
	},
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const { user } = useUser();

	// Prepare user data for NavUser component
	const userData = {
		name: user?.fullName || user?.firstName || "User",
		email: user?.emailAddresses?.[0]?.emailAddress || "user@example.com",
		avatar: user?.imageUrl || "/placeholder-user.jpg",
	};

	// Navigation items

	return (
		<Sidebar
			collapsible="offcanvas"
			{...props}
			className="border-1 border-l-0 border-b-0 border-r-sidebar-border text-sidebar-foreground bg-sidebar shadow-[0px_0px_5px_5px_#261c4b5b]  backdrop-blur-[3px]  w-[var(--sidebar-width)]  data-[state=collapsed]:w-[--sidebar-collapsed-width] duration-300 ease-linear  ">
			<SidebarContent>
				<NavMain items={navItems} />
			</SidebarContent>
			<SidebarFooter>
				<NavUser user={userData} />
			</SidebarFooter>
		</Sidebar>
	);
}
