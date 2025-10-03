"use client";
// @ts-ignore
import type React from "react";
import { ThemeProvider } from "@/components/theme-provider";

export function ClientProviders({ children }: { children: React.ReactNode }) {
	return <ThemeProvider attribute="class">{children}</ThemeProvider>;
}
