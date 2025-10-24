import {
	Body,
	Container,
	Head,
	Hr,
	Html,
	Img,
	Link,
	Section,
	Text,
} from "@react-email/components";
import type * as React from "react";

export interface EmailLayoutProps {
	title: string;
	previewText?: string;
	baseUrl: string;
	children: React.ReactNode;
}

export function EmailLayout({ title, previewText, baseUrl, children }: EmailLayoutProps) {
	const appUrl = baseUrl || "https://www.podslice.ai";
	const logoSrc = `${appUrl}/logo.svg`;
	return (
		<Html>
			<Head>
				<title>{title}</title>
			</Head>
			{/* Note: React Email adds hidden preview text via <Preview>, but we will inline a Text block at the top if needed by callers */}
			<Body
				style={{
					margin: 0,
					padding: 0,
					backgroundColor: "#ffffff",
					fontFamily:
						"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,ui-sans-serif,system-ui,sans-serif",
				}}>
				<Container
					style={{
						maxWidth: "600px",
						margin: "0 auto",
						backgroundColor: "#ffffff",
						padding: "40px 20px",
					}}>
					<Section style={{ textAlign: "center", marginBottom: 12 }}>
						<Link href={appUrl} target="_blank" style={{ textDecoration: "none" }}>
							<Img
								src={logoSrc}
								alt="PODSLICE"
								width="120"
								style={{
									display: "block",
									margin: "0 auto",
									border: 0,
									outline: "none",
									textDecoration: "none",
								}}
							/>
						</Link>
					</Section>
					<Hr
						style={{
							border: "none",
							borderTop: "1px solid #26574E",
							height: 3,
							background: "#00000010",
							margin: "16px 0 24px",
						}}
					/>
					{previewText ? (
						<Text
							style={{
								display: "none",
								color: "transparent",
								height: 0,
								maxHeight: 0,
								overflow: "hidden",
							}}>
							{previewText}
						</Text>
					) : null}
					{children}
				</Container>
			</Body>
		</Html>
	);
}
