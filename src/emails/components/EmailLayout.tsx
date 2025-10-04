/**
 * EmailLayout component
 * Standard layout wrapper for all PODSLICE emails
 * Includes header with logo and separator, and consistent container styling
 */

import { Body, Container, Head, Html, Preview } from "@react-email/components";
import * as React from "react";
import { EMAIL_CONSTANTS } from "../utils";
import { EmailHeader } from "./EmailHeader";

export interface EmailLayoutProps {
	title: string;
	previewText?: string;
	children: React.ReactNode;
}

export function EmailLayout({ title, previewText, children }: EmailLayoutProps) {
	const { maxWidth, backgroundColor, paddingVertical, paddingHorizontal } =
		EMAIL_CONSTANTS.CONTAINER;
	const { fontFamily } = EMAIL_CONSTANTS.TYPOGRAPHY;

	return (
		<Html>
			<Head>
				<title>{title}</title>
			</Head>
			{previewText && <Preview>{previewText}</Preview>}
			<Body
				style={{
					margin: 0,
					padding: 0,
					backgroundColor: "#f8fafc",
					fontFamily,
				}}
			>
				<Container
					style={{
						maxWidth: `${maxWidth}px`,
						margin: "0 auto",
						backgroundColor,
						padding: `${paddingVertical}px ${paddingHorizontal}px`,
					}}
				>
					<EmailHeader />
					{children}
				</Container>
			</Body>
		</Html>
	);
}
