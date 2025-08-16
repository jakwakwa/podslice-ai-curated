"use client"

import { usePathname, useRouter } from "next/navigation"

export default function AdminTabs() {
	const router = useRouter()
	const pathname = usePathname()
	const tabs = [
		{ href: "/admin/bundles", label: "Bundles" },
		{ href: "/admin/podcasts", label: "Podcasts" },
		{ href: "/admin/episodes", label: "Episodes" },
	]
	return (
		<div className="w-full border-b border-border/40 mb-4">
			<nav className="max-w-6xl mx-auto flex items-center gap-2 px-4">
				{tabs.map(tab => {
					const isActive = pathname === tab.href
					return (
						<button
							key={tab.href}
							type="button"
							onClick={() => router.push(tab.href)}
							className={`text-sm px-3 py-2 rounded-md transition-colors ${isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"}`}>
							{tab.label}
						</button>
					)
				})}
			</nav>
		</div>
	)
}
