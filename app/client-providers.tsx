"use client"

import { ThemeProvider } from "@/components/theme-provider"
import type React from "react"

export function ClientProviders({ children }: { children: React.ReactNode }) {
	return (
		<ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
			{children}
		</ThemeProvider>
	)
}
