/**
 * Trial Ending Email Template
 * Sent to notify users that their trial period is ending soon
 */

import { Button, Heading, Hr, Section, Text } from "@react-email/components";
import { EmailLayout } from "../components/EmailLayout";
import { EMAIL_CONSTANTS, getEmailBaseUrl } from "../utils";

export interface TrialEndingEmailProps {
	userFirstName: string;
	daysRemaining: number;
	upgradeUrl: string;
}

export function TrialEndingEmail({
	userFirstName,
	daysRemaining,
	upgradeUrl,
}: TrialEndingEmailProps) {
	const { fontSize, fontWeight, color, lineHeight } = EMAIL_CONSTANTS.GREETING;

	return (
		<EmailLayout
			title="Trial Ending Soon"
			previewText={`Your PODSLICE trial ends in ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}!`}
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
				Hi {userFirstName}
			</Text>

			{/* Warning Message */}
			<Section style={{ textAlign: "center", marginBottom: "16px" }}>
				<Heading
					as="h1"
					style={{
						color: EMAIL_CONSTANTS.COLORS.error,
						fontSize: "28px",
						margin: 0,
					}}
				>
					⏰ Trial Ending Soon
				</Heading>
			</Section>

			<Section
				style={{
					backgroundColor: "#fef2f2",
					border: "1px solid #fecaca",
					padding: "24px",
					borderRadius: "8px",
					marginBottom: "24px",
				}}
			>
				<Text
					style={{
						color: EMAIL_CONSTANTS.COLORS.error,
						margin: 0,
						fontWeight: 500,
						textAlign: "center",
					}}
				>
					Your trial ends in {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}
				</Text>
			</Section>

			<Text
				style={{
					color: EMAIL_CONSTANTS.COLORS.text.secondary,
					fontSize: "16px",
					lineHeight: 1.5,
					marginBottom: "24px",
				}}
			>
				Don't lose access to your personalized podcast feeds! Your PODSLICE trial is ending soon.
			</Text>

			<Section style={{ textAlign: "center", marginBottom: "32px" }}>
				<Button
					href={upgradeUrl}
					style={{
						display: "inline-block",
						backgroundColor: EMAIL_CONSTANTS.COLORS.error,
						color: "white",
						padding: "14px 28px",
						textDecoration: "none",
						borderRadius: "6px",
						fontWeight: 500,
						fontSize: "16px",
					}}
				>
					Upgrade Now
				</Button>
			</Section>

			<Section
				style={{
					backgroundColor: EMAIL_CONSTANTS.COLORS.background.gray,
					padding: "20px",
					borderRadius: "8px",
				}}
			>
				<Heading
					as="h3"
					style={{
						color: EMAIL_CONSTANTS.COLORS.text.secondary,
						fontSize: "18px",
						margin: "0 0 12px 0",
					}}
				>
					Continue enjoying:
				</Heading>
				<ul
					style={{
						color: EMAIL_CONSTANTS.COLORS.text.muted,
						margin: 0,
						paddingLeft: "20px",
					}}
				>
					<li>Unlimited personalized feeds</li>
					<li>Weekly AI-generated episodes</li>
					<li>Advanced curation features</li>
					<li>Priority support</li>
				</ul>
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
					Questions? Reply to this email or contact our support team.
					<br />
					The PODSLICE Team
				</Text>
			</Section>
		</EmailLayout>
	);
}

TrialEndingEmail.PreviewProps = {
	userFirstName: "Alex",
	daysRemaining: 3,
	upgradeUrl: `${getEmailBaseUrl()}/upgrade`,
} as TrialEndingEmailProps;

export default TrialEndingEmail;
