/**
 * Email template registry
 * Central registry of all email templates with metadata for preview and rendering
 */

import type * as React from "react";
import EpisodeFailedEmail, {
	type EpisodeFailedEmailProps,
} from "./templates/EpisodeFailedEmail";
import EpisodeReadyEmail, {
	type EpisodeReadyEmailProps,
} from "./templates/EpisodeReadyEmail";
import SubscriptionExpiringEmail, {
	type SubscriptionExpiringEmailProps,
} from "./templates/SubscriptionExpiringEmail";
import TestEmail, { type TestEmailProps } from "./templates/TestEmail";
import TrialEndingEmail, {
	type TrialEndingEmailProps,
} from "./templates/TrialEndingEmail";
import WeeklyReminderEmail, {
	type WeeklyReminderEmailProps,
} from "./templates/WeeklyReminderEmail";

export interface EmailTemplate<P = unknown> {
	/** Unique identifier for the template */
	id: string;
	/** URL-friendly slug */
	slug: string;
	/** Display name for UI */
	displayName: string;
	/** Description of when this email is sent */
	description: string;
	/** The React component */
	component: React.ComponentType<P>;
	/** Function to get email subject */
	getSubject: (props: P) => string;
	/** Function to get sample props for preview */
	getSampleProps: () => P;
}

/**
 * Registry of all email templates
 */
export const EMAIL_TEMPLATES = {
	EPISODE_READY: {
		id: "episode-ready",
		slug: "episode-ready",
		displayName: "Episode Ready",
		description:
			"Sent when a user's weekly podcast episode has been generated and is ready",
		component: EpisodeReadyEmail,
		getSubject: (props: EpisodeReadyEmailProps) =>
			`🎧 Your episode "${props.episodeTitle}" is ready!`,
		getSampleProps: () => EpisodeReadyEmail.PreviewProps,
	} as EmailTemplate<EpisodeReadyEmailProps>,

	EPISODE_FAILED: {
		id: "episode-failed",
		slug: "episode-failed",
		displayName: "Episode Failed",
		description: "Sent when an episode generation fails due to technical difficulties",
		component: EpisodeFailedEmail,
		getSubject: (props: EpisodeFailedEmailProps) =>
			`Action Required: Issue with your episode "${props.episodeTitle}"`,
		getSampleProps: () => EpisodeFailedEmail.PreviewProps,
	} as EmailTemplate<EpisodeFailedEmailProps>,

	TRIAL_ENDING: {
		id: "trial-ending",
		slug: "trial-ending",
		displayName: "Trial Ending",
		description: "Sent to notify users that their trial period is ending soon",
		component: TrialEndingEmail,
		getSubject: (props: TrialEndingEmailProps) =>
			`⏰ Your PODSLICE trial ends in ${props.daysRemaining} day${props.daysRemaining !== 1 ? "s" : ""}`,
		getSampleProps: () => TrialEndingEmail.PreviewProps,
	} as EmailTemplate<TrialEndingEmailProps>,

	SUBSCRIPTION_EXPIRING: {
		id: "subscription-expiring",
		slug: "subscription-expiring",
		displayName: "Subscription Expiring",
		description: "Sent to notify users that their subscription is about to expire",
		component: SubscriptionExpiringEmail,
		getSubject: () => "🔔 Your PODSLICE subscription expires soon",
		getSampleProps: () => SubscriptionExpiringEmail.PreviewProps,
	} as EmailTemplate<SubscriptionExpiringEmailProps>,

	WEEKLY_REMINDER: {
		id: "weekly-reminder",
		slug: "weekly-reminder",
		displayName: "Weekly Reminder",
		description: "Sent to remind users that their weekly episode will be generated soon",
		component: WeeklyReminderEmail,
		getSubject: () => "📅 Your weekly PODSLICE episode will be generated soon",
		getSampleProps: () => WeeklyReminderEmail.PreviewProps,
	} as EmailTemplate<WeeklyReminderEmailProps>,

	TEST: {
		id: "test",
		slug: "test",
		displayName: "Test Email",
		description: "Simple email for testing the email service functionality",
		component: TestEmail,
		getSubject: () => "🧪 PODSLICE Email Test",
		getSampleProps: () => TestEmail.PreviewProps,
	} as EmailTemplate<TestEmailProps>,
} as const;

/**
 * Get all email templates as an array
 */
export function getAllTemplates(): EmailTemplate<any>[] {
	return Object.values(EMAIL_TEMPLATES) as EmailTemplate<any>[];
}

/**
 * Get an email template by slug
 */
export function getTemplateBySlug(slug: string): EmailTemplate<unknown> | null {
	const template = getAllTemplates().find(t => t.slug === slug);
	return template || null;
}

/**
 * Type exports
 */
export type {
	EpisodeReadyEmailProps,
	EpisodeFailedEmailProps,
	TrialEndingEmailProps,
	SubscriptionExpiringEmailProps,
	WeeklyReminderEmailProps,
	TestEmailProps,
};
