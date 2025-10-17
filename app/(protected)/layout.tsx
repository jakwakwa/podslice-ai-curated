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
import { NotificationBell } from "@/components/ui/notification-bell";
import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSubscriptionInit } from "@/hooks/useSubscriptionInit";
import { Footer } from "./footer";

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
			<Button onClick={() => setTheme(theme === "light" ? "dark" : "light")} variant="icon">
				<div className="flex flex-col md:flex-row items-center gap-2">
					{theme === "light" ? <SunIcon className="w-4 h-4 text-amber-300" /> : <MoonIcon className="w-4 h-4 text-indigo-300" />} <span className="text-[0.5rem] uppercase"> theme</span>
				</div>
			</Button>
		);
	}

	return (
		<>
			<AppSidebar />

			<SidebarInset>
				<header
					className={`fixed flex h-18 bg-header backdrop-blur-[4px]  shadow-[0_4px_8px_1px_rgba(0,0,0,0.3)] overflow-hidden shrink-0 items-center border-none gap-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 mt-0 max-w-screen justify-between px-4  py-0 overflow-y-scrol  duration-300 z-50 ${state === "expanded" ? "" : "collapsed"}`}>
					<div className={`flex items-center h-14 justify-start  ${state === "expanded" ? "md:px-4 w-[240px]" : "md:px-0 w-[80px] "}`}>
						<Link href="/" className={`flex items-center h-24 justify-center gap-2   ${state === "expanded" ? "md:px-4" : "md:px-0"}`}>
							<Image
								className={`transition-all flex flex-row items-center  duration-75 w-full ${state === "expanded" ? "h-14 max-w-[94px] " : "max-w-[40px]   justify-center"}`}
								src={`${state === "expanded" ? "/logo" : "/icon"}.svg`}
								width={100}
								height={14}
								alt={`Menu`}
							/>
						</Link>

						<SidebarTrigger className="hidden md:block md:w-[px] w-0 h-0 md:h-[14px] border border-[#50647a0] border-none shadow-none" size={"xs"} variant="outline" />
					</div>
					<div className="flex flex-row-reverse items-center gap-5">
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
						{!isMobile && typeof window !== "undefined" && <NotificationBell />}

						{isMobile && <UserNavMobile user={userData} />}
						<ModeToggle />
					</div>
				</header>

				<div
					className={` shimmer flex flex-col flex-grow transition-all duration-300 ease-in-out px-0 md:px-0 mt-8 md:mt-0 mb-2 m-0 p-0 h-screen ${state === "expanded" ? "ml-0 w-full md:ml-0 md:p-0  " : "ml-0 md:ml-0 w-full md:max-w-[80vw]"}`}>
					<div className={"layout-inset "} />
					<div
						className={` md:w-full animated-gradient   mx-0  p-0 flex flex-col my-0 md:flex-row pt-6 md:pb-2 md:pt-16 md:mx-0 pl-0  md:my-2   ${state === "expanded" ? "m-0 md:ml-0 md:p-0  lg:px-2 lg:pb-8 max-w-full" : "pl-12 pr-24 md:ml-0  min-w-screen  "}`}>
						{children}
					</div>
					<Footer />
				</div>
			</SidebarInset>
		</>
	);
}

export const UserNavMobile = ({ user }: { user: { name: string; email: string; avatar: string } }) => {
	return (
		<div className=" rounded-lg relative  md:max-h-9 flex items-center md:items-start  max-w-[36px]  border-0 border-cyan-100/10 bg-secondary overflow-hidden justify-center  outline-0  p-1  transition-all duration-300 ease-in-out max-h-9 h-9 mx-auto ">
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
	const mobileNav = navItems;

	return (
		<div className="grid gap-3 bottom-0 w-full mb-6">
			<ul className="grid gap-2 py-2 w-full">
				{mobileNav.map(item => (
					<li key={item.title} className=" text-left text-sm w-full ">
						{item.subItems && item.subItems.length > 0 ? (
							// Parent item with subItems - not clickable
							<div className=" bg-teal-900/30 rounded-lg flex text-left flex-col items-start justify-start  mx-auto gap-2 font-medium border border-cyan-200/10 shadow-lg shadow-cyan-400/10 text-shadow-cyan-900/10 text-cyan-100/70 max-w-[70%] md:max-w-full backdrop-blur-md my-0 p-0 ">
								<div className="flex pl-8 flex-row items-center justify-start gap-2 mt-4">
									{item.icon && <item.icon className="size-4 opacity-[0.5]" />}
									{item.title}
								</div>

								<ul className="flex flex-col gap-2 py-2 px-8 w-full mt-0 mb-2">
									{item.subItems.map(subItem => (
										<li key={subItem.name} className="text-left text-sm w-full">
											<Link
												href={subItem.url}
												onClick={() => setOpenMobileDrawer(false)}
												className="py-3 bg-white/10 rounded-lg flex text-left flex-row items-center justify-start cursor-pointer gap-2 font-normal shadow-sm text-cyan-100/60 max-w-[60%] px-8 backdrop-blur-sm min-w-full my-0">
												{subItem.name}
											</Link>
										</li>
									))}
								</ul>
							</div>
						) : (
							// Regular item without subItems - clickable
							<Link
								href={item.url}
								onClick={() => setOpenMobileDrawer(false)}
								className="py-3 bg-teal-900/30 rounded-lg flex text-left flex-row items-center justify-start cursor-pointer  my-0 mx-auto gap-2 font-medium border border-cyan-200/10 shadow-lg shadow-cyan-400/10 text-shadow-cyan-900/10  text-cyan-100/70 max-w-[70%] md:max-w-fit pl-8 backdrop-blur-md ">
								{item.icon && <item.icon className="size-4 opacity-[0.5]" />}
								{item.title}
							</Link>
						)}
					</li>
				))}
			</ul>
		</div>
	);
}
