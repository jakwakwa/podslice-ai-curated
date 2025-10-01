"use client";

import { useAuth } from "@clerk/nextjs";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { DynamicBreadcrumb } from "@/components/ui/dynamic-breadcrumb";
import { NotificationBell } from "@/components/ui/notification-bell";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useSubscriptionInit } from "@/hooks/useSubscriptionInit";

function ProtectedLayoutInner({ children }: { children: React.ReactNode }) {
	const { state } = useSidebar();

	// Initialize subscription data
	useSubscriptionInit();

	return (
		<>
			<AppSidebar />

			<SidebarInset>
				<header
					className={`fixed flex h-16 backdrop-blur-[4px] shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 mt-0 w-screen justify-between px-2 md:px-4 py-0 overflow-y-scrol shadow-[0_4px_30px_-4px_rgba(0,0,0,0.5)] duration-300  z-50 ${state === "expanded" ? "" : ""}`}>
					<div className={`flex items-center h-16 justify-between gap-2 px-2  ${state === "expanded" ? "md:px-4" : "md:px-0"}`}>
						<Image className={`w-full max-w-[100px] ${state === "expanded" ? "inline " : "hidden"}`} src="/logo.png" width={300} height={100} alt="logo" />

						<Separator orientation="vertical" className={`data-[orientation=vertical]:min-h-[8px] border-[0px] border-r-[#000] bg-[#14171600] w-[1px] ${state === "expanded" ? "ml-12" : "ml-0 mr-0"}`}>
							{""}
						</Separator>

						<SidebarTrigger className="w-[52px] h-[24px] border border-[#50647a0] border-none shadow-none" size={"xs"} variant="outline" />

						<Separator
							orientation="vertical"
							className={`data-[orientation=vertical]:min-h-[8px] border-[0px] border-r-[#342d3d0] bg-[#a5adb03e] w-[1px] ${state === "expanded" ? "mr-12 ml-5.5" : "mx-2 ml-0	"}`}>
							{""}
						</Separator>

						<DynamicBreadcrumb />
					</div>
					<NotificationBell />
				</header>

				<div
					className={`flex flex-col flex-grow transition-all duration-300 ease-in-out px-0 md:px-0 mt-8 md:mt-0 mb-2 m-0 p-0 h-screen ${state === "expanded" ? "ml-0 w-full md:ml-3 md:pr-2 " : "ml-0 md:ml-12 w-full md:max-w-[95vw]"}`}>
					<div className={'grain-blur '} />
					<div className={'grid-bg-one '} />
					<div className={'grain-background background-base'} />

					<div className={'layout-inset'} />
					<div className="w-[99%] p-0 flex flex-col my-0 md:flex-row pt-6 md:pb-2 md:pt-20 mx-0 pl-1 pr-3 md:px-2 min-w-full md:my-2 sm:ml-6 md:pl-0 md:pr-12 ">{children}</div>
				</div>
			</SidebarInset>
		</>
	);
}

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
