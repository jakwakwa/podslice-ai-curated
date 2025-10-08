/**
 * Subscription Expiring Email Template
 * Sent to notify users that their subscription is about to expire
 */

import { Button, Heading, Hr, Section, Text } from "@react-email/components";
import { EmailLayout } from "../components/EmailLayout";
import { EMAIL_CONSTANTS, getEmailBaseUrl } from "../utils";

export interface SubscriptionExpiringEmailProps {
	userFirstName: string;
	expirationDate: string;
	renewUrl: string;
}

export function SubscriptionExpiringEmail({
	userFirstName,
	expirationDate,
	renewUrl,
}: SubscriptionExpiringEmailProps) {
	const { fontSize, fontWeight, color, lineHeight } = EMAIL_CONSTANTS.GREETING;

	return (
		<EmailLayout
			title="Subscription Expiring"
			previewText={`Your PODSLICE subscription expires on ${expirationDate}.`}
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
						color: EMAIL_CONSTANTS.COLORS.warning,
						fontSize: "28px",
						margin: 0,
					}}
				>
					🔔 Subscription Expiring
				</Heading>
			</Section>

			<Section
				style={{
					backgroundColor: "#fffbeb",
					border: "1px solid #fed7aa",
					padding: "24px",
					borderRadius: "8px",
					marginBottom: "24px",
				}}
			>
				<Text
					style={{
						color: EMAIL_CONSTANTS.COLORS.warning,
						margin: 0,
						fontWeight: 500,
						textAlign: "center",
					}}
				>
					Expires on {expirationDate}
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
				Your PODSLICE subscription is set to expire soon. Don't miss out on your personalized
				podcast content!
			</Text>

			<Section style={{ textAlign: "center", marginBottom: "32px" }}>
				<Button
					href={renewUrl}
					style={{
						display: "inline-block",
						backgroundColor: EMAIL_CONSTANTS.COLORS.warning,
						color: "white",
						padding: "14px 28px",
						textDecoration: "none",
						borderRadius: "6px",
						fontWeight: 500,
						fontSize: "16px",
					}}
				>
					Renew Subscription
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
					Need help? Contact our support team.
					<br />
					The PODSLICE Team
				</Text>
			</Section>
		</EmailLayout>
	);
}

SubscriptionExpiringEmail.PreviewProps = {
	userFirstName: "Alex",
	expirationDate: "October 15, 2025",
	renewUrl: `${getEmailBaseUrl()}/renew`,
} as SubscriptionExpiringEmailProps;

export default SubscriptionExpiringEmail;
