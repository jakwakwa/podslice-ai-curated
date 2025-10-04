/**
 * Episode Ready Email Template
 * Sent when a user's weekly podcast episode has been generated and is ready to listen
 */

import { Button, Heading, Hr, Link, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "../components/EmailLayout";
import { EMAIL_CONSTANTS, getEmailBaseUrl } from "../utils";

export interface EpisodeReadyEmailProps {
	userFirstName: string;
	episodeTitle: string;
	episodeUrl: string;
	profileName: string;
}

export function EpisodeReadyEmail({
	userFirstName,
	episodeTitle,
	episodeUrl,
	profileName,
}: EpisodeReadyEmailProps) {
	const baseUrl = getEmailBaseUrl();
	const { fontSize, fontWeight, color, lineHeight, marginBottom } = EMAIL_CONSTANTS.GREETING;

	return (
		<EmailLayout
			title="Your Episode is Ready!"
			previewText={`Great news! Your weekly podcast episode "${episodeTitle}" is ready to listen.`}
		>
			{/* Greeting */}
			<Text
				style={{
					color,
					fontSize: `${fontSize + 1}px`, // Slightly larger for Episode Ready
					lineHeight,
					fontWeight: "bold",
					textAlign: "center",
					margin: `0 0 8px 0`,
				}}
			>
				Hi {userFirstName}
			</Text>

			{/* Success Message */}
			<Heading
				as="h1"
				style={{
					margin: "0px",
					fontWeight: 500,
					fontSize: "1.5rem",
					lineHeight: "1.8rem",
					color: "rgb(39 134 126)",
					textAlign: "center",
				}}
			>
				Woohoo! Great news!
			</Heading>

			<Text
				style={{
					marginTop: "1rem",
					marginBottom: "1rem",
					fontWeight: 700,
					fontSize: "1.4rem",
					lineHeight: 1.5,
					color: "rgb(30 30 33)",
					textAlign: "center",
				}}
			>
				Your custom episode has been generated and is ready for you to enjoy.
			</Text>

			<Text
				style={{
					marginBottom: "1rem",
					fontWeight: 500,
					fontSize: "1.275rem",
					lineHeight: "2rem",
					color: "rgb(66 75 92)",
					marginTop: "16px",
					textAlign: "center",
				}}
			>
				🎧 "{episodeTitle}"
			</Text>

			{/* Separator */}
			<Hr
				style={{
					marginTop: "1.5rem",
					width: "100%",
					border: "none",
					borderTop: "1px solid #B27CD9",
					borderColor: "#8E00FB",
				}}
			/>

			{/* CTA Section */}
			<Section style={{ paddingBottom: "1.5rem", textAlign: "center" }}>
				<Text
					style={{
						color: "rgb(17,24,39)",
						fontSize: "1.25rem",
						lineHeight: "2rem",
						marginTop: "16px",
						marginBottom: "16px",
					}}
				>
					If you found this summary useful
					<br />
					and want to share with other's
				</Text>

				<Button
					href={episodeUrl}
					style={{
						marginTop: "1rem",
						display: "inline-flex",
						alignItems: "center",
						borderRadius: "9999px",
						backgroundColor: "#025E5F",
						paddingLeft: "3rem",
						paddingRight: "3rem",
						paddingTop: "1rem",
						paddingBottom: "1rem",
						textAlign: "center",
						fontWeight: 700,
						fontSize: "0.875rem",
						lineHeight: "1.25rem",
						color: "rgb(225 242 240)",
						textDecoration: "none",
					}}
				>
					View or Share
				</Button>

				<Link
					href={`${baseUrl}/dashboard`}
					style={{
						marginTop: "1rem",
						display: "block",
						alignItems: "center",
						textAlign: "center",
						fontWeight: 700,
						color: "rgb(17,24,39)",
						fontSize: "0.875rem",
						lineHeight: "1.25rem",
						textDecoration: "none",
					}}
				>
					Go to your dashboard
				</Link>
			</Section>
		</EmailLayout>
	);
}

EpisodeReadyEmail.PreviewProps = {
	userFirstName: "Alex",
	episodeTitle: "Tech News Roundup - Week 42",
	episodeUrl: `${getEmailBaseUrl()}/episodes/abc123`,
	profileName: "Tech & Innovation",
} as EpisodeReadyEmailProps;

export default EpisodeReadyEmail;
