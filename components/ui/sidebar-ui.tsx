"use client"

import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { PanelLeft } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useIsMobile } from "@/hooks/use-mobile"
import styles from "./sidebar-ui.module.css"

const SIDEBAR_COOKIE_NAME = "sidebar_state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const SIDEBAR_WIDTH = "18rem"
const SIDEBAR_WIDTH_MOBILE = "18rem"
const SIDEBAR_WIDTH_ICON = "4rem"
const SIDEBAR_KEYBOARD_SHORTCUT = "b"

type SidebarContextProps = {
	state: "expanded" | "collapsed"
	open: boolean
	setOpen: (open: boolean) => void
	openMobile: boolean
	setOpenMobile: (open: boolean) => void
	isMobile: boolean
	toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextProps | null>(null)

function useSidebar() {
	const context = React.useContext(SidebarContext)
	if (!context) {
		throw new Error("useSidebar must be used within a SidebarProvider.")
	}

	return context
}

const SidebarProvider = React.forwardRef<
	HTMLDivElement,
	React.ComponentProps<"div"> & {
		defaultOpen?: boolean
		open?: boolean
		onOpenChange?: (open: boolean) => void
	}
>(({ defaultOpen = true, open: openProp, onOpenChange: setOpenProp, className, style, children, ...props }, ref) => {
	const isMobile = useIsMobile()
	const [openMobile, setOpenMobile] = React.useState(false)

	// This is the internal state of the sidebar.
	// We use openProp and setOpenProp for control from outside the component.
	const [_open, _setOpen] = React.useState(defaultOpen)
	const open = openProp ?? _open
	const setOpen = React.useCallback(
		(value: boolean | ((value: boolean) => boolean)) => {
			const openState = typeof value === "function" ? value(open) : value
			console.log("🔧 SidebarProvider: setOpen called with", { openState, open, isMobile })

			if (setOpenProp) {
				setOpenProp(openState)
			} else {
				_setOpen(openState)
			}

			// This sets the cookie to keep the sidebar state.
			// biome-ignore lint/suspicious/noDocumentCookie: Required for sidebar state persistence across sessions
			document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
		},
		[setOpenProp, open, isMobile]
	)

	// Helper to toggle the sidebar.
	// biome-ignore lint/correctness/useExhaustiveDependencies: Dependencies are intentionally excluded for performance
	const toggleSidebar = React.useCallback(() => {
		console.log("🔧 SidebarProvider: toggleSidebar called", { isMobile, open })
		return isMobile ? setOpenMobile(open => !open) : setOpen(open => !open)
	}, [isMobile, setOpen, setOpenMobile, open])

	// Adds a keyboard shortcut to toggle the sidebar.
	React.useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
				event.preventDefault()
				toggleSidebar()
			}
		}

		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [toggleSidebar])

	const state = open ? "expanded" : "collapsed"
	console.log("🔧 SidebarProvider: state calculated", { state, open, isMobile })

	// biome-ignore lint/correctness/useExhaustiveDependencies: Dependencies are intentionally excluded for performance
	const contextValue = React.useMemo<SidebarContextProps>(
		() => ({
			state,
			open,
			setOpen,
			isMobile,
			openMobile,
			setOpenMobile,
			toggleSidebar,
		}),
		[state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]
	)

	return (
		<SidebarContext.Provider value={contextValue}>
			<TooltipProvider delayDuration={0}>
				<div
					style={
						{
							"--sidebar-width": SIDEBAR_WIDTH,
							"--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
							...style,
						} as React.CSSProperties
					}
					className={styles.sidebarWrapper}
					ref={ref}
					{...props}
				>
					{children}
				</div>
			</TooltipProvider>
		</SidebarContext.Provider>
	)
})
SidebarProvider.displayName = "SidebarProvider"

const Sidebar = React.forwardRef<
	HTMLDivElement,
	React.ComponentProps<"div"> & {
		side?: "left" | "right"
		variant?: "sidebar" | "floating" | "inset"
		collapsible?: "offcanvas" | "icon" | "none"
	}
>(({ side = "left", variant = "sidebar", collapsible = "offcanvas", className, children, ...props }, ref) => {
	const { isMobile, state, openMobile, setOpenMobile } = useSidebar()

	console.log(" Sidebar: rendering", { isMobile, state, openMobile, side, variant, collapsible })

	if (collapsible === "none") {
		return (
			<div className={`${styles.sidebarBase} ${styles.collapsibleNone} ${className}`} ref={ref} {...props}>
				{children}
			</div>
		)
	}

	if (isMobile) {
		return (
			<Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
				<SheetContent
					data-sidebar="sidebar"
					data-mobile="true"
					className={styles.sheetContent}
					style={
						{
							"--sidebar-width": SIDEBAR_WIDTH_MOBILE,
						} as React.CSSProperties
					}
					side={side}
				>
					<SheetHeader className="sr-only">
						<SheetTitle>Sidebar</SheetTitle>
						<SheetDescription>Displays the mobile sidebar.</SheetDescription>
					</SheetHeader>
					<div className={styles.mobileSidebarContent}>{children}</div>
				</SheetContent>
			</Sheet>
		)
	}

	return (
		<div ref={ref} className={`${styles.sidebarDesktop} group peer`} data-state={state} data-collapsible={state === "collapsed" ? collapsible : ""} data-variant={variant} data-side={side}>
			{/* This is what handles the sidebar gap on desktop */}
			<div className={styles.sidebarGap} data-collapsible={collapsible} data-side={side} data-variant={variant} />
			<div className={`${styles.sidebarContainer} ${className}`} data-side={side} data-collapsible={collapsible} data-variant={variant} data-state={state} {...props}>
				<div data-sidebar="sidebar" className={`${styles.sidebarInner} ${styles[`sidebarInner-${variant}`]}`}>
					{children}
				</div>
			</div>
		</div>
	)
})
Sidebar.displayName = "Sidebar"

const SidebarTrigger = React.forwardRef<React.ElementRef<typeof Button>, React.ComponentProps<typeof Button>>(({ className, onClick, ...props }, ref) => {
	const { toggleSidebar } = useSidebar()

	console.log("🔧 SidebarTrigger: rendering")

	return (
		<Button
			ref={ref}
			data-sidebar="trigger"
			variant="ghost"
			size="icon"
			className={`${styles.sidebarTrigger} ${className}`}
			onClick={event => {
				console.log("🔧 SidebarTrigger: clicked")
				onClick?.(event)
				toggleSidebar()
			}}
			{...props}
		>
			<PanelLeft />
			<span className="sr-only">Toggle Sidebar</span>
		</Button>
	)
})
SidebarTrigger.displayName = "SidebarTrigger"

const SidebarRail = React.forwardRef<HTMLButtonElement, React.ComponentProps<"button">>(({ className, ...props }, ref) => {
	const { toggleSidebar } = useSidebar()

	return <button ref={ref} data-sidebar="rail" aria-label="Toggle Sidebar" tabIndex={-1} onClick={toggleSidebar} title="Toggle Sidebar" className={`${styles.sidebarRail} ${className}`} {...props} />
})
SidebarRail.displayName = "SidebarRail"

const SidebarInset = React.forwardRef<HTMLDivElement, React.ComponentProps<"main">>(({ className, ...props }, ref) => {
	return <main ref={ref} className={`${styles.sidebarInset} ${className}`} {...props} />
})
SidebarInset.displayName = "SidebarInset"

const SidebarInput = React.forwardRef<React.ElementRef<typeof Input>, React.ComponentProps<typeof Input>>(({ className, ...props }, ref) => {
	return <Input ref={ref} data-sidebar="input" className={`${styles.sidebarInput} ${className}`} {...props} />
})
SidebarInput.displayName = "SidebarInput"

const SidebarHeader = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => {
	return <div ref={ref} data-sidebar="header" className={`${styles.sidebarHeader} ${className}`} {...props} />
})
SidebarHeader.displayName = "SidebarHeader"

const SidebarFooter = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => {
	return <div ref={ref} data-sidebar="footer" className={`${styles.sidebarFooter} ${className}`} {...props} />
})
SidebarFooter.displayName = "SidebarFooter"

const SidebarSeparator = React.forwardRef<React.ElementRef<typeof Separator>, React.ComponentProps<typeof Separator>>(({ className, ...props }, ref) => {
	return <Separator ref={ref} data-sidebar="separator" className={`${styles.sidebarSeparator} ${className}`} {...props} />
})
SidebarSeparator.displayName = "SidebarSeparator"

const SidebarContent = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => {
	return <div ref={ref} data-sidebar="content" className={`${styles.sidebarContent} ${className}`} {...props} />
})
SidebarContent.displayName = "SidebarContent"

const SidebarGroup = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => {
	return <div ref={ref} data-sidebar="group" className={`${styles.sidebarGroup} ${className}`} {...props} />
})
SidebarGroup.displayName = "SidebarGroup"

const SidebarGroupLabel = React.forwardRef<HTMLDivElement, React.ComponentProps<"div"> & { asChild?: boolean }>(({ className, asChild = false, ...props }, ref) => {
	const Comp = asChild ? Slot : "div"

	return <Comp ref={ref} data-sidebar="group-label" className={`${styles.sidebarGroupLabel} ${className}`} {...props} />
})
SidebarGroupLabel.displayName = "SidebarGroupLabel"

const SidebarGroupAction = React.forwardRef<HTMLButtonElement, React.ComponentProps<"button"> & { asChild?: boolean }>(({ className, asChild = false, ...props }, ref) => {
	const Comp = asChild ? Slot : "button"

	return <Comp ref={ref} data-sidebar="group-action" className={`${styles.sidebarGroupAction} ${className}`} {...props} />
})
SidebarGroupAction.displayName = "SidebarGroupAction"

const SidebarGroupContent = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => (
	<div ref={ref} data-sidebar="group-content" className={`${styles.sidebarGroupContent} ${className}`} {...props} />
))
SidebarGroupContent.displayName = "SidebarGroupContent"

const SidebarMenu = React.forwardRef<HTMLUListElement, React.ComponentProps<"ul">>(({ className, ...props }, ref) => (
	<ul ref={ref} data-sidebar="menu" className={`${styles.sidebarMenu} ${className}`} {...props} />
))
SidebarMenu.displayName = "SidebarMenu"

const SidebarMenuItem = React.forwardRef<HTMLLIElement, React.ComponentProps<"li">>(({ className, ...props }, ref) => (
	<li ref={ref} data-sidebar="menu-item" className={`${styles.sidebarMenuItem} ${className}`} {...props} />
))
SidebarMenuItem.displayName = "SidebarMenuItem"

const sidebarMenuButtonVariants = cva(styles.sidebarMenuButton, {
	variants: {
		variant: {
			default: styles.sidebarMenuButtonDefault,
			outline: styles.sidebarMenuButtonOutline,
		},
		size: {
			default: styles.sidebarMenuButtonDefaultSize,
			sm: styles.sidebarMenuButtonSm,
			lg: styles.sidebarMenuButtonLg,
		},
	},
	defaultVariants: {
		variant: "default",
		size: "default",
	},
})

const SidebarMenuButton = React.forwardRef<
	HTMLButtonElement,
	React.ComponentProps<"button"> & {
		asChild?: boolean
		isActive?: boolean
		tooltip?: string | React.ComponentProps<typeof TooltipContent>
	} & VariantProps<typeof sidebarMenuButtonVariants>
>(({ asChild = false, isActive = false, variant = "default", size = "default", tooltip, className, ...props }, ref) => {
	const Comp = asChild ? Slot : "button"
	const { isMobile, state } = useSidebar()

	const button = <Comp ref={ref} data-sidebar="menu-button" data-size={size} data-active={isActive} className={`${sidebarMenuButtonVariants({ variant, size })} ${className}`} {...props} />

	if (!tooltip) {
		return button
	}

	if (typeof tooltip === "string") {
		tooltip = {
			children: tooltip,
		}
	}

	return (
		<Tooltip>
			<TooltipTrigger asChild>{button}</TooltipTrigger>
			<TooltipContent side="right" align="center" hidden={state !== "collapsed" || isMobile} {...tooltip} />
		</Tooltip>
	)
})
SidebarMenuButton.displayName = "SidebarMenuButton"

const SidebarMenuAction = React.forwardRef<
	HTMLButtonElement,
	React.ComponentProps<"button"> & {
		asChild?: boolean
		showOnHover?: boolean
	}
>(({ className, asChild = false, showOnHover = false, ...props }, ref) => {
	const Comp = asChild ? Slot : "button"

	return <Comp ref={ref} data-sidebar="menu-action" className={`${styles.sidebarMenuAction} ${showOnHover ? styles.sidebarMenuActionShowOnHover : ""} ${className}`} {...props} />
})
SidebarMenuAction.displayName = "SidebarMenuAction"

const SidebarMenuBadge = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => (
	<div ref={ref} data-sidebar="menu-badge" className={`${styles.sidebarMenuBadge} ${className}`} {...props} />
))
SidebarMenuBadge.displayName = "SidebarMenuBadge"

const SidebarMenuSkeleton = React.forwardRef<
	HTMLDivElement,
	React.ComponentProps<"div"> & {
		showIcon?: boolean
	}
>(({ className, showIcon = false, ...props }, ref) => {
	// Random width between 50 to 90%.
	const width = React.useMemo(() => {
		return `${Math.floor(Math.random() * 40) + 50}%`
	}, [])

	return (
		<div ref={ref} data-sidebar="menu-skeleton" className={`${styles.sidebarMenuSkeleton} ${className}`} {...props}>
			{showIcon && <Skeleton className={styles.sidebarMenuSkeletonIcon} data-sidebar="menu-skeleton-icon" />}
			<Skeleton
				className={styles.sidebarMenuSkeletonText}
				data-sidebar="menu-skeleton-text"
				style={
					{
						"--skeleton-width": width,
					} as React.CSSProperties
				}
			/>
		</div>
	)
})
SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton"

const SidebarMenuSub = React.forwardRef<HTMLUListElement, React.ComponentProps<"ul">>(({ className, ...props }, ref) => (
	<ul ref={ref} data-sidebar="menu-sub" className={`${styles.sidebarMenuSub} ${className}`} {...props} />
))
SidebarMenuSub.displayName = "SidebarMenuSub"

const SidebarMenuSubItem = React.forwardRef<HTMLLIElement, React.ComponentProps<"li">>(({ className, ...props }, ref) => <li ref={ref} className={className} {...props} />)
SidebarMenuSubItem.displayName = "SidebarMenuSubItem"

const SidebarMenuSubButton = React.forwardRef<
	HTMLAnchorElement,
	React.ComponentProps<"a"> & {
		asChild?: boolean
		size?: "sm" | "md"
		isActive?: boolean
	}
>(({ asChild = false, size = "md", isActive, className, ...props }, ref) => {
	const Comp = asChild ? Slot : "a"

	return (
		<Comp
			ref={ref}
			data-sidebar="menu-sub-button"
			data-size={size}
			data-active={isActive}
			className={`${styles.sidebarMenuSubButton} ${size === "sm" ? styles.sidebarMenuSubButtonSm : styles.sidebarMenuSubButtonMd} ${className}`}
			{...props}
		/>
	)
})
SidebarMenuSubButton.displayName = "SidebarMenuSubButton"

export {
	Sidebar,
	SidebarContext,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupAction,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInput,
	SidebarInset,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSkeleton,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarProvider,
	SidebarRail,
	SidebarSeparator,
	SidebarTrigger,
	useSidebar,
}
