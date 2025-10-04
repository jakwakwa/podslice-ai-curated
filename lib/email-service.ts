import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { EMAIL_TEMPLATES } from "@/src/emails";
import type {
	EpisodeFailedEmailProps,
	EpisodeReadyEmailProps,
	SubscriptionExpiringEmailProps,
	TestEmailProps,
	TrialEndingEmailProps,
	WeeklyReminderEmailProps,
} from "@/src/emails";
import { renderEmailSync } from "@/src/emails/render";

export interface EmailNotification {
	to: string;
	subject: string;
	text: string;
	html: string;
}

export interface EpisodeReadyEmailData {
	userFirstName: string;
	episodeTitle: string;
	episodeUrl: string;
	profileName: string;
}

export interface EpisodeFailedEmailData {
	userFirstName: string;
	episodeTitle: string;
}

export interface TrialEndingEmailData {
	userFirstName: string;
	daysRemaining: number;
	upgradeUrl: string;
}

export interface SubscriptionExpiringEmailData {
	userFirstName: string;
	expirationDate: string;
	renewUrl: string;
}

class EmailService {
	private client: Resend | null = null;
	private initialized = false;

	// Remove constructor - don't initialize on import
	// constructor() {
	// 	this.initializeTransporter()
	// }

	private initializeClient() {
		// Skip if already initialized
		if (this.initialized) return;
		this.initialized = true;

		// Check if Resend is configured
		if (!process.env.RESEND_API_KEY) {
			console.warn("Email service not configured. Set RESEND_API_KEY and EMAIL_FROM environment variables.");
			return;
		}

		try {
			this.client = new Resend(process.env.RESEND_API_KEY);
			if (process.env.NODE_ENV === "development") {
				console.log("Resend client initialized");
			}
		} catch (error) {
			console.error("Failed to initialize Resend client:", error);
			this.client = null;
		}
	}

	private async canSendEmail(userId: string): Promise<boolean> {
		try {
			const user = await prisma.user.findUnique({
				where: { user_id: userId },
				select: { email_notifications: true },
			});
			return user?.email_notifications ?? false;
		} catch (error) {
			console.error("Error checking email preferences:", error);
			return false;
		}
	}

	async sendEmail(notification: EmailNotification): Promise<boolean> {
		// Lazy initialize on first use
		this.initializeClient();

		if (!this.client) {
			console.warn("Resend client not available - check RESEND_API_KEY");
			return false;
		}
		if (!process.env.EMAIL_FROM) {
			console.warn("EMAIL_FROM not set - cannot send email");
			return false;
		}

		try {
			const result = await this.client.emails.send({
				from: process.env.EMAIL_FROM,
				to: notification.to,
				subject: notification.subject,
				text: notification.text,
				html: notification.html,
			});
			if ((result as { error?: unknown }).error) {
				console.error("Resend send error:", (result as { error: unknown }).error);
				return false;
			}
			return true;
		} catch (error) {
			console.error("Failed to send email via Resend:", error);
			return false;
		}
	}

	// Episode ready notification
	async sendEpisodeReadyEmail(
		userId: string,
		userEmail: string,
		data: EpisodeReadyEmailData,
	): Promise<boolean> {
		if (!(await this.canSendEmail(userId))) {
			console.log(`Email notifications disabled for user ${userId}`);
			return false;
		}

		const emailProps: EpisodeReadyEmailProps = {
			userFirstName: data.userFirstName,
			episodeTitle: data.episodeTitle,
			episodeUrl: data.episodeUrl,
			profileName: data.profileName,
		};

		const { html, text } = renderEmailSync(
			EMAIL_TEMPLATES.EPISODE_READY.component,
			emailProps,
		);

		const notification: EmailNotification = {
			to: userEmail,
			subject: EMAIL_TEMPLATES.EPISODE_READY.getSubject(emailProps),
			text,
			html,
		};

		return await this.sendEmail(notification);
	}

	// Episode failed notification
	async sendEpisodeFailedEmail(
		userId: string,
		userEmail: string,
		data: EpisodeFailedEmailData,
	): Promise<boolean> {
		if (!(await this.canSendEmail(userId))) {
			console.log(`Email notifications disabled for user ${userId}`);
			return false;
		}

		const emailProps: EpisodeFailedEmailProps = {
			userFirstName: data.userFirstName,
			episodeTitle: data.episodeTitle,
		};

		const { html, text } = renderEmailSync(
			EMAIL_TEMPLATES.EPISODE_FAILED.component,
			emailProps,
		);

		const notification: EmailNotification = {
			to: userEmail,
			subject: EMAIL_TEMPLATES.EPISODE_FAILED.getSubject(emailProps),
			text,
			html,
		};

		return await this.sendEmail(notification);
	}

	// Trial ending notification
	async sendTrialEndingEmail(
		userId: string,
		userEmail: string,
		data: TrialEndingEmailData,
	): Promise<boolean> {
		if (!(await this.canSendEmail(userId))) {
			console.log(`Email notifications disabled for user ${userId}`);
			return false;
		}

		const emailProps: TrialEndingEmailProps = {
			userFirstName: data.userFirstName,
			daysRemaining: data.daysRemaining,
			upgradeUrl: data.upgradeUrl,
		};

		const { html, text } = renderEmailSync(
			EMAIL_TEMPLATES.TRIAL_ENDING.component,
			emailProps,
		);

		const notification: EmailNotification = {
			to: userEmail,
			subject: EMAIL_TEMPLATES.TRIAL_ENDING.getSubject(emailProps),
			text,
			html,
		};

		return await this.sendEmail(notification);
	}

	// Subscription expiring notification
	async sendSubscriptionExpiringEmail(
		userId: string,
		userEmail: string,
		data: SubscriptionExpiringEmailData,
	): Promise<boolean> {
		if (!(await this.canSendEmail(userId))) {
			console.log(`Email notifications disabled for user ${userId}`);
			return false;
		}

		const emailProps: SubscriptionExpiringEmailProps = {
			userFirstName: data.userFirstName,
			expirationDate: data.expirationDate,
			renewUrl: data.renewUrl,
		};

		const { html, text } = renderEmailSync(
			EMAIL_TEMPLATES.SUBSCRIPTION_EXPIRING.component,
			emailProps,
		);

		const notification: EmailNotification = {
			to: userEmail,
			subject: EMAIL_TEMPLATES.SUBSCRIPTION_EXPIRING.getSubject(emailProps),
			text,
			html,
		};

		return await this.sendEmail(notification);
	}

	// Weekly reminder notification
	async sendWeeklyReminderEmail(
		userId: string,
		userEmail: string,
		userName: string,
	): Promise<boolean> {
		if (!(await this.canSendEmail(userId))) {
			console.log(`Email notifications disabled for user ${userId}`);
			return false;
		}

		const emailProps: WeeklyReminderEmailProps = {
			userName,
		};

		const { html, text } = renderEmailSync(
			EMAIL_TEMPLATES.WEEKLY_REMINDER.component,
			emailProps,
		);

		const notification: EmailNotification = {
			to: userEmail,
			subject: EMAIL_TEMPLATES.WEEKLY_REMINDER.getSubject(emailProps),
			text,
			html,
		};

		return await this.sendEmail(notification);
	}

	// Test email functionality
	async sendTestEmail(to: string): Promise<boolean> {
		const emailProps: TestEmailProps = {
			recipientEmail: to,
		};

		const { html, text } = renderEmailSync(EMAIL_TEMPLATES.TEST.component, emailProps);

		const notification: EmailNotification = {
			to,
			subject: EMAIL_TEMPLATES.TEST.getSubject(emailProps),
			text,
			html,
		};

		return await this.sendEmail(notification);
	}
}

// Export singleton instance
export const emailService = new EmailService();
export default emailService;
