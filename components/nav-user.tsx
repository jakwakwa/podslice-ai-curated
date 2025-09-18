"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { Bell, CreditCard, LogOutIcon, MoreVerticalIcon, Shield } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { getAccountPortalUrlWithRedirect } from "@/lib/env";

export function NavUser({
	user,
}: {
	user: {
		name: string;
		email: string;
		avatar: string;
	};
}) {
	const { isMobile } = useSidebar();
	const { signOut } = useClerk();
	const { isLoaded, isSignedIn } = useAuth();
	const [isAdmin, setIsAdmin] = useState(false);

	// Compute Clerk Account Portal direct link with redirect using env helpers
	const _accountPortalUrl = getAccountPortalUrlWithRedirect();

	// Generate initials from user name
	const getInitials = (name: string) => {
		if (!name) return "U";
		return name
			.split(" ")
			.map(part => part.charAt(0).toUpperCase())
			.slice(0, 2)
			.join("");
	};

	// Check if user is admin
	useEffect(() => {
		const checkAdminStatus = async () => {
			try {
				const response = await fetch("/api/admin/check");
				if (response.ok) {
					setIsAdmin(true);
				}
			} catch (error) {
				console.error("Failed to check admin status:", error);
			}
		};

		if (isLoaded && isSignedIn) {
			checkAdminStatus();
		}
	}, [isLoaded, isSignedIn]);

	if (!isLoaded) {
		return (
			<SidebarMenu>
				<SidebarMenuItem>
					<SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
						<Avatar className="h-8 w-8 rounded-lg filter grayscale">
							<AvatarFallback className="rounded-lg">...</AvatarFallback>
						</Avatar>
						<div className="grid flex-1 text-left text-sm leading-tight">
							<span className="truncate font-medium">Loading...3</span>
							<span className="truncate text-xs text-muted-foreground">Loading. 2..</span>
						</div>
						<MoreVerticalIcon className="ml-auto h-4 w-4" />
					</SidebarMenuButton>
				</SidebarMenuItem>
			</SidebarMenu>
		);
	}

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton size="lg" className="border-none outline-none data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
							<Avatar className="h-8 w-8 rounded-lg filter ">
								<AvatarImage src={user.avatar} alt={user.name} />
								<AvatarFallback className="rounded-lg">{getInitials(user.name)}</AvatarFallback>
							</Avatar>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-medium text-foreground/90 text-sm">{user.name}</span>
								<span className="truncate text-xxs text-muted-foreground/80 font-[300] mt-1">{user.email}</span>
							</div>
							<MoreVerticalIcon className="ml-auto h-4 w-4" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="dropdown-menu-card w-[--radix-dropdown-menu-trigger-width] min-w-full md:min-w-56 rounded-lg text-foreground text-sm font-[400] leading-tight"
						side={isMobile ? "bottom" : "right"}
						align="end"
						sideOffset={4}>
						<DropdownMenuLabel className="p-0 font-normal">
							<div className="flex items-center gap-2 px-1 md:px-2 pb-4.5 text-left text-sm  text-foreground font-[400] leading-tight">
								<Avatar className="h-8 w-8 rounded-lg filter">
									<AvatarImage src={user.avatar} alt={user.name} />
									<AvatarFallback className="rounded-lg">{getInitials(user.name)}</AvatarFallback>
								</Avatar>
								<div className="grid flex-1 text-left text-xs leading-tight">
									<span className="truncate font-medium text-sm text-secondary-foreground">{user.name}</span>
									<span className="truncate my-0 font-[200] text-sm text-foreground/70">{user.email}</span>
								</div>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuGroup className="flex flex-col gap-1 py-2">
							<DropdownMenuItem asChild>
								<Link href="/notification-preferences">
									<Bell className="h-4 w-4" />
									Notification Preferences
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem asChild>
								<Link href="/manage-membership">
									<CreditCard className="h-4 w-4" />
									Subscription
								</Link>
							</DropdownMenuItem>
						</DropdownMenuGroup>
						{isAdmin && (
							<>
								<DropdownMenuSeparator />
								<DropdownMenuGroup>
									<DropdownMenuItem asChild>
										<Link href="/admin">
											<Shield className="h-4 w-4" />
											Admin Portal (Restricted Access)
										</Link>
									</DropdownMenuItem>
								</DropdownMenuGroup>
							</>
						)}
						<DropdownMenuSeparator />
						<DropdownMenuItem
							className="text-sm mt-2"
							onClick={async () => {
								try {
									await signOut();
								} catch {
									console.error("Sign out failed from nav-user.tsx, try again");
								}
							}}>
							<LogOutIcon />
							Log out
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
