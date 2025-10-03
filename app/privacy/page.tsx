"use client";

import { Bell, Database, Eye, FileText, Globe, Lock, Shield } from "lucide-react";
import Link from "next/link";
import { LandingPageHeader } from "@/components/layout/LandingPageHeader";
import { CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPage() {
	const lastUpdated = "July 2025";

	return (
		<>
			<LandingPageHeader />
			<div className="container max-w-4xl mx-auto py-24 px-4">
				<div className="text-center mb-12">
					<h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
					<p className="text-foreground/90">Last updated: {lastUpdated}</p>
				</div>

				<div className="text-foreground/90 max-w-4xl prose prose-lg">
					<div className="mb-8">
						<CardHeader className="my-4 text-xl font-bold">
							<CardTitle className="flex items-center gap-2">
								<Shield className="h-5 w-5" />
								1. Our Commitment to Your Privacy
							</CardTitle>
						</CardHeader>
						<div>
							<p className="mb-4">
								At Podslice.ai, we are deeply committed to protecting your privacy and personal information. We believe that privacy is a fundamental human right, and we are dedicated to upholding the
								highest standards of data protection and privacy practices.
							</p>
							<p className="mb-4">
								This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our AI-powered podcast curation and summarization services. We are committed
								to transparency, user control, and implementing privacy-by-design principles in everything we do.
							</p>
							<p>
								We comply with international privacy laws including the General Data Protection Regulation (GDPR), California Consumer Privacy Act (CCPA), Protection of Personal Information Act
								(POPIA), and other applicable privacy regulations worldwide.
							</p>
						</div>
					</div>

					<div className="mb-8">
						<CardHeader className="my-4 text-xl font-bold">
							<CardTitle className="flex items-center gap-2">
								<Database className="h-5 w-5" />
								2. Information We Collect
							</CardTitle>
						</CardHeader>
						<div>
							<h4 className="font-semibold mb-2">Personal Information</h4>
							<ul className="list-disc pl-6 space-y-2 mb-4">
								<li>Name and email address for account creation and communication</li>
								<li>Payment information (processed securely through trusted payment providers)</li>
								<li>Profile preferences and podcast curation settings</li>
								<li>Communication preferences and marketing consent</li>
							</ul>

							<h4 className="font-semibold mb-2">Service Usage Information</h4>
							<ul className="list-disc pl-6 space-y-2 mb-4">
								<li>Podcast selections and listening preferences</li>
								<li>AI-generated content interactions and feedback</li>
								<li>Service usage patterns and feature preferences</li>
								<li>Device information for service optimization</li>
							</ul>

							<h4 className="font-semibold mb-2">Technical Information</h4>
							<ul className="list-disc pl-6 space-y-2">
								<li>IP address and general location data (for service delivery)</li>
								<li>Browser type and device information</li>
								<li>Performance and error data for service improvement</li>
								<li>Analytics data (anonymized where possible)</li>
							</ul>
						</div>
					</div>

					<div className="mb-8">
						<CardHeader className="my-4 text-xl font-bold">
							<CardTitle className="flex items-center gap-2">
								<Eye className="h-5 w-5" />
								3. How We Use Your Information
							</CardTitle>
						</CardHeader>
						<div>
							<p className="mb-4">We use your information solely for the following legitimate purposes:</p>
							<ul className="list-disc pl-6 space-y-2">
								<li>Provide and maintain our podcast curation and AI summarization services</li>
								<li>Process payments and manage your subscription securely</li>
								<li>Personalize your experience and content recommendations</li>
								<li>Generate AI-powered summaries based on your preferences</li>
								<li>Communicate important service updates and features</li>
								<li>Improve our services through anonymized analytics</li>
								<li>Ensure security and prevent fraud</li>
								<li>Comply with legal obligations and privacy regulations</li>
							</ul>
							<p className="mt-4 text-md text-secondary-foreground">We will never sell, rent, or trade your personal information to third parties for marketing purposes.</p>
						</div>
					</div>

					<div className="mb-8">
						<CardHeader className="my-4 text-xl font-bold">
							<CardTitle className="flex items-center gap-2">
								<Lock className="h-5 w-5" />
								4. Data Security and Protection
							</CardTitle>
						</CardHeader>
						<div>
							<p className="mb-4">We implement industry-leading security measures to protect your personal information:</p>
							<ul className="list-disc pl-6 space-y-2">
								<li>End-to-end encryption for data in transit and at rest</li>
								<li>Regular security audits and vulnerability assessments</li>
								<li>Multi-factor authentication and access controls</li>
								<li>Secure payment processing through trusted providers</li>
								<li>Employee training on data protection and privacy</li>
								<li>Incident response procedures and breach notification protocols</li>
							</ul>
							<p className="mt-4 text-md text-secondary-foreground">
								While we implement robust security measures, no method of transmission over the internet is 100% secure. We continuously monitor and improve our security practices.
							</p>
						</div>
					</div>

					<div className="mb-8">
						<CardHeader className="my-4 text-xl font-bold">
							<CardTitle className="flex items-center gap-2">
								<Globe className="h-5 w-5" />
								5. International Data Transfers
							</CardTitle>
						</CardHeader>
						<div>
							<p className="mb-4">
								As a global service, your information may be transferred to and processed in countries other than your own. We ensure all international transfers comply with applicable privacy laws:
							</p>
							<ul className="list-disc pl-6 space-y-2">
								<li>GDPR-compliant transfers using standard contractual clauses</li>
								<li>Adequacy decisions and appropriate safeguards</li>
								<li>Transparent disclosure of transfer locations</li>
								<li>Local data protection authority compliance</li>
							</ul>
							<p className="mt-4">We maintain data processing agreements with all service providers and ensure they meet our privacy standards.</p>
						</div>
					</div>

					<div className="mb-8">
						<CardHeader className="my-4 text-xl font-bold">
							<CardTitle className="flex items-center gap-2">
								<FileText className="h-5 w-5" />
								6. Your Privacy Rights
							</CardTitle>
						</CardHeader>
						<div>
							<p className="mb-4">You have comprehensive rights regarding your personal information:</p>
							<ul className="list-disc pl-6 space-y-2">
								<li>
									<strong>Access:</strong> Request a copy of your personal information
								</li>
								<li>
									<strong>Correction:</strong> Update or correct inaccurate information
								</li>
								<li>
									<strong>Deletion:</strong> Request deletion of your personal information
								</li>
								<li>
									<strong>Portability:</strong> Receive your data in a structured, machine-readable format
								</li>
								<li>
									<strong>Restriction:</strong> Limit how we process your information
								</li>
								<li>
									<strong>Objection:</strong> Object to certain types of processing
								</li>
								<li>
									<strong>Withdrawal:</strong> Withdraw consent for marketing communications
								</li>
								<li>
									<strong>Automated Decisions:</strong> Request human review of automated decisions
								</li>
							</ul>
							<p className="mt-4">
								To exercise these rights, contact us at <strong>jkotzee@icloud.com</strong>. We will respond within 30 days.
							</p>
						</div>
					</div>

					<div className="mb-8">
						<CardHeader className="my-4 text-xl font-bold">
							<CardTitle className="flex items-center gap-2">
								<Bell className="h-5 w-5" />
								7. Marketing and Communications
							</CardTitle>
						</CardHeader>
						<div>
							<p className="mb-4">We respect your communication preferences and only send marketing communications with your explicit consent:</p>
							<ol className="list-decimal pl-6 space-y-2">
								<li>Clear opt-in mechanisms for marketing communications</li>
								<li>Easy unsubscribe options in all marketing emails</li>
								<li>Granular consent management for different communication types</li>
								<li>Respect for "Do Not Track" browser settings</li>
							</ol>
							<p className="mt-4">You can manage your communication preferences in your account settings or contact us directly.</p>
						</div>
					</div>

					<div className="mb-8">
						<CardHeader className="my-4 text-xl font-bold">
							<CardTitle>8. Data Retention</CardTitle>
						</CardHeader>
						<div>
							<p className="mb-4">We retain your personal information only for as long as necessary to fulfill the purposes outlined in this policy:</p>
							<ol className="list-decimal pl-6 space-y-2">
								<li>
									<strong>Account data:</strong> Retained while your account is active and for 30 days after deletion
								</li>
								<li>
									<strong>Payment information:</strong> Retained as required by financial regulations
								</li>
								<li>
									<strong>Usage data:</strong> Anonymized after 12 months for service improvement
								</li>
								<li>
									<strong>Marketing data:</strong> Retained until you withdraw consent or unsubscribe
								</li>
							</ol>
							<p className="mt-4">We regularly review and delete data that is no longer necessary for our legitimate business purposes.</p>
						</div>
					</div>
					<h4 className="font-bold text-lg mb-2 mt-6">13. THIRD PARTY SITES</h4>
					<ol className="list-decimal pl-6 space-y-2">
						<li>
							This Privacy Notice does not apply to the websites of any other parties, or the applications, products or services, such websites advertise and which may be linked to this Website, or
							websites that link to or advertise this Website. Podslice is not responsible for the privacy practices of such third party websites.
						</li>
						<li>We carefully select third-party service providers who share our commitment to privacy and transparency. Below are the specific services we use:</li>

						<li>
							We advise you to read the privacy policy of each third party website and decide whether you agree to their privacy practices and policies, as these third party websites may also be
							collecting or sharing your Personal Information
						</li>

						<li>
							<h4 className="font-bold text-lg mb-2 mt-6">Authentication Services</h4>
						</li>
						<ul className="list-disc pl-6 space-y-2">
							<li className="mb-2">
								<strong>Clerk</strong> - We use Clerk for user authentication and account management. Clerk processes your login credentials, profile information, and authentication data to provide
								secure access to our services.
							</li>
						</ul>

						<li>
							<h4 className="font-bold text-lg mb-2 mt-6">Payment Processing</h4>
							<ul className="list-disc pl-6 space-y-2">
								<li className="mb-2">
									<strong>Paddle</strong> - We use Paddle for secure payment processing and subscription management. Paddle processes your payment information, billing details, and subscription data
									to facilitate transactions.
									<ul className="list-disc pl-6 space-y-2">
										<li className="mb-4">
											<Link
												href="https://www.paddle.com/legal/privacy"
												target="_blank"
												rel="noopener noreferrer"
												className="text-primary-forefround hover:underline text-teal-400/60 font-medium underline text-right">
												Paddle Privacy Policy
											</Link>
										</li>

										<li className="mb-4">
											<Link
												href="https://paddle.net/find-purchase"
												target="_blank"
												rel="noopener noreferrer"
												className="text-primary-forefround hover:underline text-teal-400/60 font-medium underline text-right">
												Find Your Purchase & Contact Paddle Support
											</Link>
										</li>
										<li className="mb-4">
											<Link
												href="https://paddle.net/verify-email"
												target="_blank"
												rel="noopener noreferrer"
												className="text-primary-forefround hover:underline text-teal-400/60 font-medium underline text-right">
												Verify Your Email with Paddle
											</Link>
										</li>
									</ul>
								</li>
							</ul>
						</li>

						<li>
							<h4 className="font-bold text-lg mb-2 mt-6">Cloud Storage Services</h4>
						</li>

						<ul className="list-disc pl-6 space-y-2">
							<li className="mb-2">
								<strong>Google Cloud Services</strong> - We use Google Cloud for secure storage of audio files only. Google Cloud stores podcast audio content and AI-generated audio summaries. No user
								personal information is stored in Google Cloud services.
							</li>
							<ul className="list-disc pl-6 space-y-2">
								<li className="mb-2">
									<strong>Analytics services with privacy-focused configurations</strong> - We use Analytics services with privacy-focused configurations for analytics and insights.
								</li>
								<li className="mb-2">
									<strong>All providers bound by data processing agreements</strong> - We use All providers bound by data processing agreements for data processing agreements.
								</li>
							</ul>
						</ul>
						<li>
							<h4 className="font-bold text-lg mb-2 mt-6">Other Service Providers</h4>
						</li>
						<ul className="list-disc pl-6 space-y-2">
							<li className="mb-2">
								<strong>Cloud providers with robust security certifications</strong> - We use Cloud providers with robust security certifications for secure storage of audio files.
							</li>
						</ul>
					</ol>

					<p className="mt-4">
						We maintain data processing agreements with all service providers and ensure they meet our privacy standards. We do not sell, rent, or trade your personal information to third parties for
						marketing purposes.
					</p>

					<div className="mb-8">
						<CardHeader className="my-4 text-xl font-bold">
							<CardTitle>10. Children's Privacy</CardTitle>
						</CardHeader>
						<div className="text-foreground/90">
							<p>
								Our service is not intended for children under 16 years of age. We do not knowingly collect personal information from children under 16. If you are a parent or guardian and believe
								your child has provided us with personal information, please contact us immediately.
							</p>
						</div>
					</div>

					<div className="mb-8">
						<CardHeader className="my-4 text-xl font-bold">
							<CardTitle>11. CHANGES TO THIS PRIVACY POLICY</CardTitle>
						</CardHeader>
						<div className="text-foreground/90">
							<p>
								We may update this Privacy Policy from time to time to reflect changes in our practices or applicable laws. We will notify you of any material changes by posting the new policy on this
								page and updating the "Last updated" date. Your continued use of our service after such changes constitutes acceptance of the updated policy.
							</p>
						</div>
					</div>

					<div className="mb-8"></div>
					<CardHeader className="my-4 text-xl font-bold">
						<CardTitle>12. CONSUMER PROTECTION ACT, PROTECTION OF PERSONAL INFORMATION ACT AND OTHER LAWS</CardTitle>
					</CardHeader>
					<ol className="list-decimal pl-6 space-y-2">
						<li>
							If this Privacy Notice or any provision in this Privacy Notice is regulated by or subject to the Consumer Protection Act, the Protection of Personal Information Act, 2013 ("POPIA") or
							other laws, it is not intended that any provision of this Privacy Notice contravenes any provision of the Consumer Protection Act, POPIA or such other laws. Therefore all provisions of
							this Privacy Notice must be treated as being qualified, to the extent necessary, to ensure that the provisions of the Consumer Protection Act, POPIA and such other laws are complied
							with.
						</li>

						<li>
							We advise you to read the privacy policy of each third party website and decide whether you agree to their privacy practices and policies, as these third party websites may also be
							collecting or sharing your Personal Information.
						</li>
						<li>
							{" "}
							We are not liable if you suffer losses or damages when visiting third party websites by following a link to that website from this Website. You accept that there may be risks when you
							use such third party websites, and you do so at your own risk.
						</li>

						<li>
							If this Privacy Notice or any provision in this Privacy Notice is regulated by or subject to the Consumer Protection Act, the Protection of Personal Information Act, 2013 ("POPIA") or
							other laws, it is not intended that any provision of this Privacy Notice contravenes any provision of the Consumer Protection Act, POPIA or such other laws. Therefore all provisions of
							this Privacy Notice must be treated as being qualified, to the extent necessary, to ensure that the provisions of the Consumer Protection Act, POPIA and such other laws are complied
							with.
						</li>

						<li>No provision of this Privacy Notice:</li>
						<ol className="list-disc pl-6 space-y-2">
							<li>
								does or purports to limit or exempt us from any liability (including, without limitation, for any loss directly or indirectly attributable to our gross negligence or wilful default or
								that of any other person acting for or controlled by us) to the extent that the law does not allow such a limitation or exemption;
							</li>
							<li>requires you to assume risk or liability for the kind of liability or loss, to the extent that the law does not allow such an assumption of risk or liability; or</li>
							<li>
								limits or excludes any warranties or obligations which are implied into this Privacy Notice by the Consumer Protection Act (to the extent applicable), POPIA (to the extent applicable),
								or other applicable laws or which we give under the Consumer Protection Act (to the extent applicable), POPIA (to the extent applicable), or other applicable laws, to the extent that
								the law does not allow them to be limited or excluded.
							</li>
						</ol>
					</ol>

					<ol>
						<li>
							<h4 className="font-bold text-lg mb-2 mt-6">13. GENERAL</h4>
						</li>
						<ol className="list-decimal pl-6 space-y-2">
							<li>
								You agree that this Privacy Notice our relationship and any dispute of whatsoever nature relating to or arising out of this Privacy Notice whether directly or indirectly is governed by
								South African law, without giving effect to any principle of conflict of laws.
							</li>

							<li>Our failure to exercise or enforce any right or provision of this Privacy Notice shall not constitute a waiver of such right or provision.</li>

							<ul className="list-disc pl-6 space-y-2">
								<li>Our failure to exercise or enforce any right or provision of this Privacy Notice shall not constitute a waiver of such right or provision.</li>

								<li>
									Each provision of this Privacy Notice, and each part of any provision, is removable and detachable from the others. As far as the law allows, if any provision (or part of a
									provision) of this Privacy Notice is found by a court or authority of competent jurisdiction to be illegal, invalid or unenforceable (including without limitation, because it is not
									consistent with the law of another jurisdiction), it must be treated as if it was not included in this Privacy Notice and the rest of this Privacy Notice will still be valid and
									enforceable.
								</li>
							</ul>
						</ol>
					</ol>
					<ol>
						<li className="font-bold text-lg mb-2 mt-6">
							<h5 className="font-bold text-lg mb-2 mt-6">14. QUERIES AND CONTACT DETAILS OF THE INFORMATION REGULATOR</h5>
						</li>

						<ol className="list-decimal pl-6 space-y-2">
							<li>
								Should you feel that your rights in respect of your Personal Information have been infringed, please address your concerns to the Podslice Information Officer at
								compliance@podslice.ai.
							</li>

							<li>
								If you feel that the attempts by Podslice to resolve the matter have been inadequate, you may lodge a complaint with the South African Information Regulator by accessing their website
								at https://inforegulator.org.za/.
							</li>
						</ol>
					</ol>
				</div>
			</div>

			<div className="mb-8">
				<div className="text-left mt-4 pt-8 border-t">
					<p className="text-base text-muted-foreground">This Privacy Policy is effective as of lastUpdated and; applies; to; all; users; of; our; service; worldwide.</p>
					<div className="mt-4">
						<Link href="/terms" className="text-base text-primary-forefround hover:underline">
							View our Terms of Service
						</Link>
					</div>
				</div>
			</div>
		</>
	);
}
