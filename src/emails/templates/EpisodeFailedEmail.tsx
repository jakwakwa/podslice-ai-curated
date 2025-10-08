/**
 * Episode Failed Email Template
 * Sent when an episode generation fails due to technical difficulties
 */

import { Heading, Hr, Link, Section, Text } from "@react-email/components";
import { EmailLayout } from "../components/EmailLayout";
import { EMAIL_CONSTANTS } from "../utils";

export interface EpisodeFailedEmailProps {
	userFirstName: string;
	episodeTitle: string;
}

export function EpisodeFailedEmail({ userFirstName, episodeTitle }: EpisodeFailedEmailProps) {
	const supportEmail = "notifications@podslice.ai";
	const { fontSize, fontWeight, color, lineHeight } = EMAIL_CONSTANTS.GREETING;

	return (
		<EmailLayout
			title="Episode Generation Failed"
			previewText={`We encountered a technical difficulty while generating your episode "${episodeTitle}".`}
		>
			{/* Greeting */}
			<Text
				style={{
					color,
					fontSize: `${fontSize}px`,
					lineHeight,
					fontWeight,
					textAlign: "center",
					margin: "0 0 12px 0",
				}}
			>
				Hi {userFirstName}
			</Text>

			{/* Error Message */}
			<Section style={{ textAlign: "center", marginBottom: "16px" }}>
				<Heading
					as="h1"
					style={{
						color: EMAIL_CONSTANTS.COLORS.error,
						fontSize: "22px",
						margin: 0,
					}}
				>
					Episode Generation Failed
				</Heading>
			</Section>

			<Text
				style={{
					color: EMAIL_CONSTANTS.COLORS.text.secondary,
					fontSize: "15px",
					lineHeight: 1.6,
				}}
			>
				We're sorry, but we encountered a technical difficulty while generating your episode "
				{episodeTitle}".
			</Text>

			<Text
				style={{
					color: EMAIL_CONSTANTS.COLORS.text.secondary,
					fontSize: "15px",
					lineHeight: 1.6,
				}}
			>
				Our team has been notified and is looking into the issue. Please try generating the episode
				again later. If the problem persists, feel free to reach out to our support team at{" "}
				<Link href={`mailto:${supportEmail}`} style={{ color: EMAIL_CONSTANTS.COLORS.primary }}>
					{supportEmail}
				</Link>
				.
			</Text>

			<Text
				style={{
					color: EMAIL_CONSTANTS.COLORS.text.secondary,
					fontSize: "15px",
					lineHeight: 1.6,
				}}
			>
				We apologize for any inconvenience this may have caused.
			</Text>

			<Hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "24px 0" }} />

			<Text
				style={{
					color: EMAIL_CONSTANTS.COLORS.text.light,
					fontSize: "12px",
					margin: 0,
					textAlign: "center",
				}}
			>
				The PODSLICE Team
			</Text>
		</EmailLayout>
	);
}

EpisodeFailedEmail.PreviewProps = {
	userFirstName: "Alex",
	episodeTitle: "Tech News Roundup - Week 42",
} as EpisodeFailedEmailProps;

export default EpisodeFailedEmail;
