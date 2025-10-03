"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarSeparator, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function NavMain({
	items,
}: {
	items: {
		title: string;
		url: string;
		icon?: LucideIcon;
		separator?: boolean;
	}[];
}) {
	const pathname = usePathname();
	const { isMobile, setOpenMobile } = useSidebar();

	const handleLinkClick = () => {
		// Close sidebar on mobile when navigation item is clicked
		if (isMobile) {
			setOpenMobile(false);
		}
	};

	return (
		<SidebarGroup>
			<SidebarMenu className=" mt-24 px-2">
				{items.map((item, index) => (
					<div key={item.title} className="my-1">
						{item.separator && index > 0 && <SidebarSeparator className="border-none bg-[#98818128] mx-0 my-5 h-[1px]" />}
						<SidebarMenuItem>
							<SidebarMenuButton asChild isActive={pathname === item.url}>
								<Link href={item.url} className={cn("flex items-center gap-4")} onClick={handleLinkClick}>
									{item.icon && <item.icon className="size-4 opacity-[0.5]" />}
									<span className="text-[0.8rem] text-foreground/60 opacity-[0.9]">{item.title}</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</div>
				))}
				<SidebarSeparator className="my-2" />
			</SidebarMenu>
		</SidebarGroup>
	);
}
