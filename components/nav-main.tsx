"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ElementType } from "react";

import {
	SidebarGroup,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarSeparator,
	useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function NavMain({
	items,
}: {
	items: {
		title: string;
		url: string;
		isActive?: boolean;
		icon?: LucideIcon | ElementType;
		separator?: boolean;
		hasSubitems?: boolean;
		subItems?: {
			isActive?: boolean;
			name: string;
			url: string;
			icon?: LucideIcon | ElementType;
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
						{item.separator && index > 0 && (
							<SidebarSeparator className="border-none text-sidebar-foreground  mx-0 my-5 h-px" />
						)}
						<SidebarMenuItem>
							<SidebarMenuButton asChild isActive={pathname === item.url}>
								<Link
									href={item.url}
									className={cn(
										"flex text-sidebar-primary-foreground opacity-100 items-center gap-4"
									)}
									onClick={handleLinkClick}>
									{!item.hasSubitems &&
										item.icon &&
										(() => {
											// biome-ignore lint/suspicious/noExplicitAny: Cast to any required to bypass strict string-assignment build error
											const Icon = item.icon as any;
											return (
												<Icon
													className={cn(
														"size-6",
														item.isActive
															? "text-indigo-600 opacity-100"
															: "text-sidebar-foreground-muted font-light"
													)}
												/>
											);
										})()}
									<span
										className={
											item.hasSubitems
												? `hidden`
												: `text-sm  text-[0.86rem] text-sidebar-primary font-light opacity-[0.9]`
										}>
										{item.title}
									</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
						{item.subItems && (
							<SidebarGroup>
								<SidebarMenu>
									{item.subItems.map(subItem => (
										<SidebarMenuItem key={subItem.url}>
											<SidebarMenuButton asChild>
												<Link href={subItem.url}>
													{subItem.icon &&
														(() => {
															// biome-ignore lint/suspicious/noExplicitAny: Cast to any required to bypass strict string-assignment build error
															const Icon = subItem.icon as any;
															return (
																<Icon
																	className={cn(
																		"size-6",
																		subItem.isActive
																			? "text-indigo-100 font-light opacity-100"
																			: "text-sidebar-foreground-muted opacity-100"
																	)}
																/>
															);
														})()}
													<span className="text-[0.9rem] font-light text-sidebar-primary opacity-[0.7]">
														{subItem.name}
													</span>
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
