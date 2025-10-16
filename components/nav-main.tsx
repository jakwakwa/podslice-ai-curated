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
		isActive?: boolean;
		icon?: LucideIcon;
		separator?: boolean;
		hasSubitems?: boolean;
		subItems?: {
			isActive?: boolean;
			name: string;
			url: string;
			icon?: LucideIcon;
		}[];
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
					<div key={item.url} className="my-1">
						{item.separator && index > 0 && <SidebarSeparator className="border-none text-sidebar-accent-foreground  mx-0 my-5 h-[1px]" />}
						<SidebarMenuItem>
							<SidebarMenuButton asChild isActive={pathname === item.url}>
								<Link href={item.url} className={cn("flex text-sidebar-primary-foreground opacity-100 items-center gap-4")} onClick={handleLinkClick}>
									{!item.hasSubitems && item.icon && <item.icon className={`size-6 ${item.isActive ? `text-indigo-600 opacity-100` : `text-sidebar-foreground-muted font-light`}`} />}
									<span className={item.hasSubitems ? `mt-3 text-primary-foreground font-light ppercase text-[0.7rem] uppercase ` : `text-sm font-light text-[0.86rem] text-sidebar-primary font-light opacity-[0.9]`}>{item.title}</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
						{item.subItems && (
							<SidebarGroup>
								{/* <SidebarGroupLabel>{item.title}</SidebarGroupLabel> */}
								<SidebarMenu>
									{item.subItems.map(subItem => (
										<SidebarMenuItem key={subItem.url}>
											<SidebarMenuButton asChild>
												<Link href={subItem.url}>
													{subItem.icon && <subItem.icon className={`size-6 ${subItem.isActive ? `text-indigo-100 font-light opacity-100` : `text-sidebar-foreground-muted opacity-100`}`} />}
													<span className="text-[0.9rem] font-light text-sidebar-primary opacity-[0.7]">{subItem.name}</span>
												</Link>
											</SidebarMenuButton>
										</SidebarMenuItem>
									))}
								</SidebarMenu>
							</SidebarGroup>
						)}
					</div>
				))}
				<SidebarSeparator className="my-2" />
			</SidebarMenu>
		</SidebarGroup>
	);
}
