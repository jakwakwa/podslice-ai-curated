import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

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
	async sendEpisodeReadyEmail(userId: string, userEmail: string, data: EpisodeReadyEmailData): Promise<boolean> {
		if (!(await this.canSendEmail(userId))) {
			console.log(`Email notifications disabled for user ${userId}`);
			return false;
		}

		const notification: EmailNotification = {
			to: userEmail,
			subject: `🎧 Your episode "${data.episodeTitle}" is ready!`,
			text: this.createEpisodeReadyTextTemplate(data),
			html: this.createEpisodeReadyHtmlTemplate(data),
		};

		return await this.sendEmail(notification);
	}

	// Episode failed notification
	async sendEpisodeFailedEmail(userId: string, userEmail: string, data: EpisodeFailedEmailData): Promise<boolean> {
		if (!(await this.canSendEmail(userId))) {
			console.log(`Email notifications disabled for user ${userId}`);
			return false;
		}

		const supportEmail = "notifications@podslice.ai";

		const text = `Hi ${data.userFirstName},

We're sorry, but we encountered a technical difficulty while generating your episode "${data.episodeTitle}".

Our team has been notified, and we are looking into it. Please try again later.

If the problem persists, please contact our support team at ${supportEmail}.

We apologize for any inconvenience.

The PODSLICE Team`;

		const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Episode Generation Failed</title>
</head>
<body
    style='background-color:rgb(255,255,255);font-family:ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"'>
    <table
      border="0"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      role="presentation"
      align="center">
      <tbody>
			<tr style="width:100%">
				<td>
					<table
						align="center"
						width="100%"
						border="0"
						cellpadding="0"
						cellspacing="0"
						role="presentation"
						style="padding:2rem;text-align:center">
						<tbody>
							<tr>
								<td>

    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #dc2626; font-size: 22px; margin: 0;">Episode Generation Failed</h1>
        </div>
				    <p style="margin-left:0px;margin-right:0px;margin-top:1rem;margin-bottom:2rem;padding:0px;text-align:center;font-weight:400;font-size:1.5rem;line-height:2rem">
							<span
								style="font-weight:700;letter-spacing:-0.05em"
								>Podslice</span
							>
						</p>


        <p style="color: #374151; font-size: 16px; line-height: 1.5;">Hi ${data.userFirstName},</p>
        <p style="color: #374151; font-size: 15px; line-height: 1.6;">We're sorry, but we encountered a technical difficulty while generating your episode "${data.episodeTitle}".</p>
        <p style="color: #374151; font-size: 15px; line-height: 1.6;">Our team has been notified and is looking into the issue. Please try generating the episode again later. If the problem persists, feel free to reach out to our support team at <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>
        <p style="color: #374151; font-size: 15px; line-height: 1.6;">We apologize for any inconvenience this may have caused.</p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">The PODSLICE Team</p>
    </div>



          </td>
        </tr>
      </tbody>
    </table>
    <!--/$-->
</body>
</html>`;

		const notification: EmailNotification = {
			to: userEmail,
			subject: `Action Required: Issue with your episode "${data.episodeTitle}"`,
			text,
			html,
		};

		return await this.sendEmail(notification);
	}

	// Trial ending notification
	async sendTrialEndingEmail(userId: string, userEmail: string, data: TrialEndingEmailData): Promise<boolean> {
		if (!(await this.canSendEmail(userId))) {
			console.log(`Email notifications disabled for user ${userId}`);
			return false;
		}

		const notification: EmailNotification = {
			to: userEmail,
			subject: `⏰ Your PODSLICE trial ends in ${data.daysRemaining} day${data.daysRemaining !== 1 ? "s" : ""}`,
			text: this.createTrialEndingTextTemplate(data),
			html: this.createTrialEndingHtmlTemplate(data),
		};

		return await this.sendEmail(notification);
	}

	// Subscription expiring notification
	async sendSubscriptionExpiringEmail(userId: string, userEmail: string, data: SubscriptionExpiringEmailData): Promise<boolean> {
		if (!(await this.canSendEmail(userId))) {
			console.log(`Email notifications disabled for user ${userId}`);
			return false;
		}

		const notification: EmailNotification = {
			to: userEmail,
			subject: `🔔 Your PODSLICE subscription expires soon`,
			text: this.createSubscriptionExpiringTextTemplate(data),
			html: this.createSubscriptionExpiringHtmlTemplate(data),
		};

		return await this.sendEmail(notification);
	}

	// Weekly reminder notification
	async sendWeeklyReminderEmail(userId: string, userEmail: string, userName: string): Promise<boolean> {
		if (!(await this.canSendEmail(userId))) {
			console.log(`Email notifications disabled for user ${userId}`);
			return false;
		}

		const notification: EmailNotification = {
			to: userEmail,
			subject: `📅 Your weekly PODSLICE episode will be generated soon`,
			text: this.createWeeklyReminderTextTemplate(userName),
			html: this.createWeeklyReminderHtmlTemplate(userName),
		};

		return await this.sendEmail(notification);
	}

	// Email Templates
	private createEpisodeReadyTextTemplate(data: EpisodeReadyEmailData): string {
		return `Hi ${data.userFirstName},

Great news! Your weekly podcast episode is ready to listen.

Episode: ${data.episodeTitle}
Personalized Feed: ${data.profileName}

Listen now: ${data.episodeUrl}

Happy listening!
The PODSLICE Team`;
	}

	private createEpisodeReadyHtmlTemplate(data: EpisodeReadyEmailData): string {
		return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Episode is Ready!</title>
</head>
 <body
    style='background-color:rgb(255,255,255);font-family:ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"'>
    <table
      border="0"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      role="presentation"
      align="center">
      <tbody>
        <tr>
          <td
            style='background-color:rgb(255,255,255);font-family:ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"'>
            <table
              align="center"
              width="100%"
              border="0"
              cellpadding="0"
              cellspacing="0"
              role="presentation"
              style="margin-left:auto;margin-right:auto;width:100%;max-width:600px;padding:0px">
              <tbody>
                <tr style="width:100%">
                  <td>
                    <table
                      align="center"
                      width="100%"
                      border="0"
                      cellpadding="0"
                      cellspacing="0"
                      role="presentation"
                      style="padding:1rem;text-align:center">
                      <tbody>
                        <tr>
                          <td>

													<div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px 20px;">
																<div style="text-align: center; margin-bottom: 32px;">
																<h1 style="color: #050506; font-size: 21px; line-height: 1.5; font-weight: bold">
																		Hi ${data.userFirstName} 
																</h1><br>
																</div>

													
																<hr style="border: none; border-top: 1px solid #26574E; margin: 32px 0; height: 3px; background:26574E;">

															
														</div>

														<h1
                              style="margin:0px;font-weight:500;font-size:1.5rem;line-height:1.8rem;color:rgb(39 134 126)">	Woohoo! Great news!
																
                            </h1>
                            <p
                              style="margin-top:1rem;margin-bottom:1rem;font-weight:700;font-size:1.4rem;line-height:1.5;color:rgb(30 30 33)">
                      			 		 Your custom episode has been generated and is ready for you to enjoy.
                            </p>
                            <p
                              style="margin-bottom:1rem;font-weight:500;font-size:1.275rem;line-height:2rem;color:rgb(66 75 92);margin-top:16px">
                             	 "🎧 ${data.episodeTitle}"
                            </p>

                            <hr style="margin-top:1.5rem;width:100%;border:none;border-top:1px solid #B27CD9;border-color:#8E00FB" />

														

														<table
															align="center"
															width="100%"
															border="0"
															cellpadding="0"
															cellspacing="0"
															role="presentation"
															style="padding-bottom:1.5rem;text-align:center">
															<tbody>
																<tr>
																	<td>
																		<p
																			style="color:rgb(17,24,39);font-size:1.25rem;line-height:2rem;margin-top:16px;margin-bottom:16px">
																			If you found this summary useful 
																			<br />and want to share with other's
																		</p>
																		<a
																			href="${data.episodeUrl}"
																			style="margin-top:1rem;display:inline-flex;align-items:center;border-radius:9999px;background-color:#025E5F;padding-left:3rem;padding-right:3rem;padding-top:1rem;padding-bottom:1rem;text-align:center;font-weight:700;font-size:0.875rem;line-height:1.25rem;color:rgb(225 242 240);text-decoration-line:none"
																			target="_blank"
																			>View or Share</a
																		>
																		<a
																			href="https://www.podslice.ai/dashboard"
																			style="margin-top:1rem;display:block;align-items:center;text-align:center;font-weight:700;color:rgb(17,24,39);font-size:0.875rem;line-height:1.25rem;text-decoration-line:none"
																			target="_blank"
																			>Go to your dashboard</a
																		>
																	</td>
																</tr>
															</tbody>
														</table>
														
													</td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
    <!--/$-->
  </body>
</html>`;
	}

	private createTrialEndingTextTemplate(data: TrialEndingEmailData): string {
		return `Hi ${data.userFirstName},

Your PODSLICE trial ends in ${data.daysRemaining} day${data.daysRemaining !== 1 ? "s" : ""}!

Don't lose access to your personalized podcast feeds. Upgrade now to continue creating unlimited personalized feeds and enjoying weekly AI-generated episodes.

Upgrade your account: ${data.upgradeUrl}

The PODSLICE Team`;
	}

	private createTrialEndingHtmlTemplate(data: TrialEndingEmailData): string {
		return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trial Ending Soon</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #dc2626; font-size: 28px; margin: 0;">⏰ Trial Ending Soon</h1>
        </div>

        <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
            <p style="color: #dc2626; margin: 0; font-weight: 500; text-align: center;">
                Your trial ends in ${data.daysRemaining} day${data.daysRemaining !== 1 ? "s" : ""}
            </p>
        </div>

        <p style="color: #374151; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
            Hi ${data.userFirstName},<br><br>
            Don't lose access to your personalized podcast feeds! Your PODSLICE trial is ending soon.
        </p>

        <div style="text-align: center; margin-bottom: 32px;">
            <a href="${data.upgradeUrl}" style="display: inline-block; background-color: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px;">Upgrade Now</a>
        </div>

        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px;">
            <h3 style="color: #374151; font-size: 18px; margin: 0 0 12px 0;">Continue enjoying:</h3>
            <ul style="color: #6b7280; margin: 0; padding-left: 20px;">
                <li>Unlimited personalized feeds</li>
                <li>Weekly AI-generated episodes</li>
                <li>Advanced curation features</li>
                <li>Priority support</li>
            </ul>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

        <div style="text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Questions? Reply to this email or contact our support team.<br>
                The PODSLICE Team
            </p>
        </div>
    </div>
</body>
</html>`;
	}

	private createSubscriptionExpiringTextTemplate(data: SubscriptionExpiringEmailData): string {
		return `Hi ${data.userFirstName},

Your PODSLICE subscription expires on ${data.expirationDate}.

To continue enjoying your personalized podcast feeds and weekly episodes, please renew your subscription.

Renew now: ${data.renewUrl}

The PODSLICE Team`;
	}

	private createSubscriptionExpiringHtmlTemplate(data: SubscriptionExpiringEmailData): string {
		return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Subscription Expiring</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #f59e0b; font-size: 28px; margin: 0;">🔔 Subscription Expiring</h1>
        </div>

        <div style="background-color: #fffbeb; border: 1px solid #fed7aa; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
            <p style="color: #f59e0b; margin: 0; font-weight: 500; text-align: center;">
                Expires on ${data.expirationDate}
            </p>
        </div>

        <p style="color: #374151; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
            Hi ${data.userFirstName},<br><br>
            Your PODSLICE subscription is set to expire soon. Don't miss out on your personalized podcast content!
        </p>

        <div style="text-align: center; margin-bottom: 32px;">
            <a href="${data.renewUrl}" style="display: inline-block; background-color: #f59e0b; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px;">Renew Subscription</a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

        <div style="text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Need help? Contact our support team.<br>
                The PODSLICE Team
            </p>
        </div>
    </div>
</body>
</html>`;
	}

	private createWeeklyReminderTextTemplate(userName: string): string {
		return `Hi ${userName},

Just a friendly reminder that your next weekly podcast episode will be generated this Friday at midnight.

Make sure your personalized feed is set up with the content you want to hear about this week.

Visit your dashboard: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard

The PODSLICE Team`;
	}

	private createWeeklyReminderHtmlTemplate(userName: string): string {
		return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weekly Reminder</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #3b82f6; font-size: 28px; margin: 0;">📅 Weekly Reminder</h1>
        </div>

        <p style="color: #374151; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
            Hi ${userName},<br><br>
            Just a friendly reminder that your next weekly podcast episode will be generated this Friday at midnight.
        </p>

        <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
            <p style="color: #1e40af; margin: 0; font-weight: 500;">
                💡 Make sure your personalized feed is set up with the content you want to hear about this week.
            </p>
        </div>

        <div style="text-align: center; margin-bottom: 32px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">Visit Dashboard</a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

        <div style="text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Happy listening!<br>
                The PODSLICE Team
            </p>
        </div>
    </div>
</body>
</html>`;
	}

	// Test email functionality
	async sendTestEmail(to: string): Promise<boolean> {
		const notification: EmailNotification = {
			to,
			subject: "🧪 PODSLICE Email Test",
			text: "This is a test email from PODSLICE. If you received this, email notifications are working correctly!",
			html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Test</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px 20px;">
        <div style="text-align: center;">
            <h1 style="color: #10b981; font-size: 28px; margin: 0 0 20px 0;">🧪 Email Test Successful!</h1>
            <p style="color: #374151; font-size: 16px; line-height: 1.5;">
                This is a test email from PODSLICE. If you received this, email notifications are working correctly!
            </p>
            <div style="margin-top: 32px;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                    The PODSLICE Team
                </p>
            </div>
        </div>
    </div>
</body>
</html>`,
		};

		return await this.sendEmail(notification);
	}
}

// Export singleton instance
export const emailService = new EmailService();
export default emailService;
