/**
 * Weekly Reminder Email Template
 * Sent to remind users that their weekly episode will be generated soon
 */

import { Button, Heading, Hr, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "../components/EmailLayout";
import { EMAIL_CONSTANTS, getEmailBaseUrl } from "../utils";

export interface WeeklyReminderEmailProps {
	userName: string;
}

export function WeeklyReminderEmail({ userName }: WeeklyReminderEmailProps) {
	const baseUrl = getEmailBaseUrl();
	const { fontSize, fontWeight, color, lineHeight } = EMAIL_CONSTANTS.GREETING;

	return (
		<EmailLayout
			title="Weekly Reminder"
			previewText="Your next weekly podcast episode will be generated this Friday at midnight."
		>
			{/* Greeting */}
			<Text
				style={{
					color,
					fontSize: `${fontSize}px`,
					lineHeight,
					fontWeight,
					textAlign: "center",
					margin: "0 0 16px 0",
				}}
			>
				Hi {userName}
			</Text>

			{/* Heading */}
			<Section style={{ textAlign: "center", marginBottom: "16px" }}>
				<Heading
					as="h1"
					style={{
						color: "#3b82f6",
						fontSize: "28px",
						margin: 0,
					}}
				>
					📅 Weekly Reminder
				</Heading>
			</Section>

			<Text
				style={{
					color: EMAIL_CONSTANTS.COLORS.text.secondary,
					fontSize: "16px",
					lineHeight: 1.5,
					marginBottom: "24px",
				}}
			>
				Just a friendly reminder that your next weekly podcast episode will be generated this Friday
				at midnight.
			</Text>

			<Section
				style={{
					backgroundColor: "#eff6ff",
					padding: "20px",
					borderRadius: "8px",
					marginBottom: "24px",
				}}
			>
				<Text
					style={{
						color: "#1e40af",
						margin: 0,
						fontWeight: 500,
					}}
				>
					💡 Make sure your personalized feed is set up with the content you want to hear about this
					week.
				</Text>
			</Section>

			<Section style={{ textAlign: "center", marginBottom: "32px" }}>
				<Button
					href={`${baseUrl}/dashboard`}
					style={{
						display: "inline-block",
						backgroundColor: "#3b82f6",
						color: "white",
						padding: "12px 24px",
						textDecoration: "none",
						borderRadius: "6px",
						fontWeight: 500,
					}}
				>
					Visit Dashboard
				</Button>
			</Section>

			<Hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "32px 0" }} />

			<Section style={{ textAlign: "center" }}>
				<Text
					style={{
						color: EMAIL_CONSTANTS.COLORS.text.light,
						fontSize: "12px",
						margin: 0,
					}}
				>
					Happy listening!
					<br />
					The PODSLICE Team
				</Text>
			</Section>
		</EmailLayout>
	);
}

WeeklyReminderEmail.PreviewProps = {
	userName: "Alex",
} as WeeklyReminderEmailProps;

export default WeeklyReminderEmail;
