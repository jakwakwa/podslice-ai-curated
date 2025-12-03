/**
 * Email utilities for generating absolute URLs and shared constants
 */

import { getAppUrl } from "@/lib/env";

/**
 * Get the base URL for the application (for email links and assets)
 */
export function getEmailBaseUrl(): string {
	return getAppUrl() || process.env.NEXT_PUBLIC_APP_URL || "https://www.podslice.ai";
}

/**
 * Get the absolute URL for the logo asset
 */
export function getLogoUrl(): string {
	return `${getEmailBaseUrl()}/logo.svg`;
}

/**
 * Email styling constants based on existing design system
 */
export const EMAIL_CONSTANTS = {
	LOGO: {
		width: 120,
		alt: "PODSLICE",
		paddingBottom: 12,
	},
	SEPARATOR: {
		color: "#26574E",
		thickness: 3,
		marginTop: 16,
		marginBottom: 24,
	},
	GREETING: {
		fontSize: 20,
		fontWeight: 700,
		color: "#050506",
		lineHeight: 1.5,
		marginBottom: 12,
	},
	CONTAINER: {
		maxWidth: 600,
		backgroundColor: "#ffffff",
		paddingVertical: 40,
		paddingHorizontal: 20,
	},
	COLORS: {
		primary: "#025E5F",
		secondary: "#26574E",
		success: "#10b981",
		warning: "#f59e0b",
		error: "#dc2626",
		text: {
			primary: "#050506",
			secondary: "#374151",
			muted: "#6b7280",
			light: "#9ca3af",
		},
		background: {
			white: "#ffffff",
			gray: "#f9fafb",
			light: "#f8fafc",
		},
	},
	TYPOGRAPHY: {
		fontFamily:
			"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
	},
} as const;
