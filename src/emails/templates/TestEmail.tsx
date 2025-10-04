/**
 * Test Email Template
 * Simple email for testing the email service functionality
 */

import { Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "../components/EmailLayout";
import { EMAIL_CONSTANTS } from "../utils";

export interface TestEmailProps {
	recipientEmail?: string;
}

export function TestEmail({ recipientEmail }: TestEmailProps) {
	return (
		<EmailLayout
			title="Email Test"
			previewText="This is a test email from PODSLICE. If you received this, email notifications are working correctly!"
		>
			<Section style={{ textAlign: "center" }}>
				<Heading
					as="h1"
					style={{
						color: EMAIL_CONSTANTS.COLORS.success,
						fontSize: "28px",
						margin: "0 0 20px 0",
					}}
				>
					🧪 Email Test Successful!
				</Heading>
				<Text
					style={{
						color: EMAIL_CONSTANTS.COLORS.text.secondary,
						fontSize: "16px",
						lineHeight: 1.5,
					}}
				>
					This is a test email from PODSLICE. If you received this, email notifications are working
					correctly!
				</Text>
				{recipientEmail && (
					<Text
						style={{
							color: EMAIL_CONSTANTS.COLORS.text.muted,
							fontSize: "14px",
							marginTop: "16px",
						}}
					>
						Sent to: {recipientEmail}
					</Text>
				)}
				<Section style={{ marginTop: "32px" }}>
					<Text
						style={{
							color: EMAIL_CONSTANTS.COLORS.text.light,
							fontSize: "12px",
							margin: 0,
						}}
					>
						The PODSLICE Team
					</Text>
				</Section>
			</Section>
		</EmailLayout>
	);
}

TestEmail.PreviewProps = {
	recipientEmail: "test@example.com",
} as TestEmailProps;

export default TestEmail;
