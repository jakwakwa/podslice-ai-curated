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
					<SidebarMenuButton size="sm" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
						<Avatar className="h-6 w-6 p-0 rounded-lg filter grayscale">
							<AvatarFallback className="rounded-lg w-8">...</AvatarFallback>
						</Avatar>
						<div className="grid flex-1 text-left text-sm leading-tight w-0">
							<span className="truncate font-medium w-0">Loading...3</span>
							<span className="truncate text-xs text-muted-foreground">Loading. 2..</span>
						</div>
						<MoreVerticalIcon className="ml-auto h-4 w-0" />
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
						<SidebarMenuButton className="h-9 w-22 md:h-10 md:w-fit md:ml-0 m-0 p-0 -ml-2   rounded-xl overflow-hidden  outline-0">


							<Avatar className=" h-10 w-11 object-cover flex items-center justify-center rounded-lg filter p-0 md:h-10 md:w-10">
								<AvatarImage src={user.avatar} alt={user.name} />
								<AvatarFallback className="text-foreground rounded-none hidden overflow-hidden">{getInitials(user.name)}</AvatarFallback>
							</Avatar>

							{!isMobile ? (
								<>
									<div className="flex flex-col my-2 p-1  flex-1 text-left text-sm leading-tight">
										<span className="truncate font-medium text-muted text-sm">{user.name}</span>
										<span className="truncate text-muted text-xs font-[300] mt-1">{user.email}</span>
									</div>
									<MoreVerticalIcon className=" md:block m-auto h-4 w-0" />
								</>
							) : null}
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="dropdown-menu-card w-[--radix-dropdown-menu-trigger-width] min-w-full md:min-w-56 rounded-lg text-muted text-sm font-[400] leading-tight"
						side={isMobile ? "bottom" : "right"}
						align="end"
						sideOffset={4}>
						<DropdownMenuLabel className="p-0 font-normal">
							<div className="flex items-center gap-2 px-1 md:px-2 py-1 text-left text-sm  text-foreground font-[400] leading-tight">
								<Avatar className="h-8 w-8 rounded-lg filter">
									<AvatarImage src={user.avatar} alt={user.name} />
									<AvatarFallback className="rounded-lg">{getInitials(user.name)}</AvatarFallback>
								</Avatar>
								<div className="flex flex-col gap-1 items-start justify-center flex-1 text-left text-xs leading-tight py-1 my-0">
									<span className="truncate font-medium text-sm text-white">{user.name}</span>
									<span className="truncate my-0 font-[200] text-xs text-white">{user.email}</span>
								</div>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuGroup className="flex flex-col gap-1 py-2">
							<DropdownMenuItem asChild>
								<Link href="/notification-preferences" className="text-white text-xs">
									<Bell className="h-4 w-4" />
									Notification Preferences
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem asChild>
								<Link href="/manage-membership" className="text-[#d9e1f8] text-xs">
									<CreditCard className="h-4 w-4" />
									Subscription
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem asChild>
								<Link href="/user-profile" className="text-[#d9e1f8] text-xs">
									<CreditCard className="h-4 w-4" />
									Account Management
								</Link>
							</DropdownMenuItem>
						</DropdownMenuGroup>
						{isAdmin && (
							<>
								<DropdownMenuSeparator />
								<DropdownMenuGroup>
									<DropdownMenuItem asChild>
										<Link href="/admin" className="text-[#d9e1f8] text-xs">
											<Shield className="h-4 w-4" />
											Admin Portal
										</Link>
									</DropdownMenuItem>
								</DropdownMenuGroup>
							</>
						)}
						<DropdownMenuSeparator />
						<DropdownMenuItem
							className="text-[#dc9bf0] text-xs"
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
