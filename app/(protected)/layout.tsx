"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { Menu, MoonIcon, SunIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { AppSidebar, navItems } from "@/components/app-sidebar";
import { NavUser } from "@/components/nav-user";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { DynamicBreadcrumb } from "@/components/ui/dynamic-breadcrumb";
import { NotificationBell } from "@/components/ui/notification-bell";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSubscriptionInit } from "@/hooks/useSubscriptionInit";

function ProtectedLayoutInner({ children }: { children: React.ReactNode }) {
	const { state } = useSidebar();
	const [openMobileDrawer, setOpenMobileDrawer] = useState(false);
	const isMobile = useIsMobile();
	const { user } = useUser();
	const userData = {
		name: user?.fullName || user?.firstName || "User",
		email: user?.emailAddresses?.[0]?.emailAddress || "user@example.com",
		avatar: user?.imageUrl || "/placeholder-user.jpg",
	};

	useSubscriptionInit();

	function ModeToggle() {
		const { setTheme, theme } = useTheme();

		return (
			<Button onClick={() => setTheme(theme === "light" ? "dark" : "light")} variant="outline">
				{theme === "light" ? <MoonIcon className="w-4 h-4" /> : <SunIcon className="w-4 h-4" />}
			</Button>
		);
	}

	return (
		<>
			<AppSidebar />

			<SidebarInset>
				<header
					className={`fixed flex h-16 bg-header backdrop-blur-[10px] shrink-0 items-center border-1 border-b-secondary gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 mt-0 w-screen justify-between px-4  py-0 overflow-y-scrol shadow-[0_4px_8px_1px_rgba(0,0,0,0.1)] duration-300 z-50 ${state === "expanded" ? "" : ""}`}>
					<div className={`flex items-center h-16 justify-between gap-2 px-2  ${state === "expanded" ? "md:px-4" : "md:px-0"}`}>
						<Image className={`w-full max-w-[100px] ${state === "expanded" ? "inline " : "hidden"}`} src="/logo.svg" width={300} height={100} alt="logo" />

						<Separator
							orientation="vertical"
							className={`data-[orientation=vertical]:min-h-[8px] border-[0px] border-r-[#00000089] bg-[#14171600] w-[1px] ${state === "expanded" ? "ml-12" : "ml-0 mr-0"}`}>
							{""}
						</Separator>

						<SidebarTrigger className="w-[52px] h-[24px] border border-[#50647a0] border-none shadow-none" size={"xs"} variant="outline" />

						<Separator
							orientation="vertical"
							className={`data-[orientation=vertical]:min-h-[8px] border-[0px] border-r-[#342d3d0] bg-[#75737b3b] w-[1px] ${state === "expanded" ? "mr-12 ml-5.5" : "mx-2 ml-0	"}`}>
							{""}
						</Separator>

						<DynamicBreadcrumb />
					</div>
					<div className="flex flex-row-reverse items-center gap-2">
						{/* <InstallButton /> */}

						{isMobile && typeof window !== "undefined" && (
							<Drawer open={openMobileDrawer} onOpenChange={setOpenMobileDrawer}>
								<DrawerTrigger asChild>
									<Button variant="outline" size="sm" className="">
										<Menu />
										<span className="hidden">Nav Menu Drawer</span>
									</Button>
								</DrawerTrigger>
								<DrawerContent className="sm:max-w-screen flex flex-col justify-center items-center bg-cyan-400/35 border-none rounded-t-xl backdrop-blur-sm mix-blend-hard-light p-0 w-full ">
									<DrawerHeader>
										<DrawerTitle className=" text-center text-cyan-100/90">Menu</DrawerTitle>
										<DrawerDescription className="text-center text-cyan-100/50">Navigate within the app</DrawerDescription>
										<ProfileForm setOpenMobileDrawer={setOpenMobileDrawer} />
									</DrawerHeader>
								</DrawerContent>
							</Drawer>
						)}

						<ModeToggle />
						<NotificationBell />


						{isMobile && <UserNavMobile user={userData} />}
					</div>
				</header>

				<div
					className={`flex flex-col flex-grow transition-all duration-300 ease-in-out px-0 md:px-0 mt-8 md:mt-0 mb-2 m-0 p-0 h-screen ${state === "expanded" ? "ml-0 w-full md:ml-3 md:pr-2 " : "ml-0 md:ml-12 w-full md:max-w-[95vw]"}`}>
					<div className={"grain-blur "} />
					<div className={"grid-bg-one "} />
					<div className={"grain-background background-base"} />

					<div className={"layout-inset"} />
					<div className="w-full md:w-full p-0 flex flex-col my-0 md:flex-row pt-6 md:pb-2 md:pt-20 mx-0 pl-0 md:pr-3 md:px-2 min-w-full md:my-2 lg:ml-6 lg:pl-0 lg:pr-12">{children}</div>
				</div>
			</SidebarInset>
		</>
	);
}

export const UserNavMobile = ({ user }: { user: { name: string; email: string; avatar: string } }) => {
	return (
		<div className="left-0 bottom-0  rounded-lg relative max-h-8 md:max-h-9 flex items-center md:items-center min-w-13 h-full border-1 border-cyan-100/10 bg-secondary overflow-hidden justify-center  outline-none  p-0 m-0  transition-all duration-300 ease-in-out ">
			<NavUser user={user} />
		</div>
	);
};

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
	const { isSignedIn, isLoaded } = useAuth();
	const router = useRouter();
	const [isUserSynced, setIsUserSynced] = useState(false);
	const [isSyncingUser, setIsSyncingUser] = useState(false);

	// Sync user to local database
	const syncUser = useCallback(async () => {
		if (isSyncingUser || isUserSynced) return;

		setIsSyncingUser(true);
		try {
			const response = await fetch("/api/sync-user", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
			});

			if (response.ok) {
				setIsUserSynced(true);
			} else {
				setIsUserSynced(true);
			}
		} catch {
			setIsUserSynced(true);
		} finally {
			setIsSyncingUser(false);
		}
	}, [isSyncingUser, isUserSynced]);

	useEffect(() => {
		if (isLoaded && !isSignedIn) {
			router.push("/sign-in");
		}
	}, [isSignedIn, isLoaded, router]);

	useEffect(() => {
		if (isLoaded && isSignedIn && !isUserSynced && !isSyncingUser) {
			syncUser();
		}
	}, [isLoaded, isSignedIn, isUserSynced, isSyncingUser, syncUser]);

	// Show minimal loading while checking authentication or syncing user
	if (!isLoaded || (isSignedIn && !isUserSynced)) {
		return (
			<SidebarProvider>
				{/* <SiteHeader /> */}
				<div className="progress-loader">
					<div className="progress-bar">
						<div className="progress-fill" />
					</div>
				</div>
			</SidebarProvider>
		);
	}

	// Redirect if not signed in
	if (!isSignedIn) {
		return (
			<SidebarProvider>
				{/* <SiteHeader /> */}
				<div className="progress-loader">
					<div className="progress-bar">
						<div className="progress-fill" />
					</div>
				</div>
			</SidebarProvider>
		);
	}

	// No auth check needed here - middleware handles all protection
	return (
		<SidebarProvider>
			<ProtectedLayoutInner>{children}</ProtectedLayoutInner>
		</SidebarProvider>
	);
}
function ProfileForm({ setOpenMobileDrawer }: { setOpenMobileDrawer: (open: boolean) => void }) {
	const { user } = useUser();
	const _userData = {
		name: user?.fullName || user?.firstName || "User",
		email: user?.emailAddresses?.[0]?.emailAddress || "user@example.com",
		avatar: user?.imageUrl || "/placeholder-user.jpg",
	};
	const mobileNav = navItems;

	return (
		<div className="grid gap-3 bottom-10 w-full">
			<ul className="grid gap-2 py-2 w-full">
				{mobileNav.map(item => (
					<li key={item.title} className=" text-left text-sm w-full ">
						{/* hide drawer when link is clicked */}
						<Link
							href={item.url}
							onClick={() => setOpenMobileDrawer(false)}
							className="py-3 bg-teal-900/30 rounded-lg flex text-left flex-row items-center justify-start cursor-pointer  my-0 mx-auto gap-2 font-medium border border-cyan-200/10 shadow-lg shadow-cyan-400/10 text-shadow-cyan-900/10  text-cyan-100/70 w-screen max-w-[70%] md:max-w-fit pl-8 backdrop-blur-md ">
							{item.icon && <item.icon className="size-4 opacity-[0.5]" />}
							{item.title}{" "}
						</Link>
					</li>
				))}
			</ul>
		</div>
	);
}
