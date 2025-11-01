export interface PrivacySection {
	id: string;
	title: string;
	icon?: string;
	content: {
		paragraphs?: string[];
		services?: Service[];
		subsections?: {
			heading?: string;
			paragraphs?: string[];
			services?: Service[];
			lists?: {
				type: "unordered" | "ordered";
				items: string[];
			}[];
		}[];
		lists?: {
			type: "unordered" | "ordered";
			items: string[];
		}[];
		highlight?: string;
	};
}

interface Service {
	heading: string;
	items?: Item[];
}

interface Item {
	name: string;
	description: string;
	links?: Link[];
}

interface Link {
	text: string;
	url: string;
}

export interface PrivacyContent {
	lastUpdated: string;
	pageTitle: string;
	sections: PrivacySection[];
	thirdPartySites: {
		id: string;
		title: string;
		content: {
			paragraphs: string[];
			services: {
				heading: string;
				items: {
					name: string;
					description: string;
					links?: {
						text: string;
						url: string;
					}[];
				}[];
			}[];
		};
	};
	contactInfo: {
		heading: string;
		paragraphs: string[];
		details: {
			name: string;
			email: string;
			website: string;
		};
	};
	footer: {
		acknowledgment: string;
		termsLinkText: string;
	};
}

export const privacyContent: PrivacyContent = {
	lastUpdated: "July 2025",
	pageTitle: "Privacy Policy",
	sections: [
		{
			id: "commitment",
			title: "1. Our Commitment to Your Privacy",
			icon: "Shield",
			content: {
				paragraphs: [
					"At Podslice.ai, we are deeply committed to protecting your privacy and personal information. We believe that privacy is a fundamental human right, and we are dedicated to upholding the highest standards of data protection and privacy practices.",
					"This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our AI-powered podcast curation and summarization services. We are committed to transparency, user control, and implementing privacy-by-design principles in everything we do.",
					"We comply with international privacy laws including the General Data Protection Regulation (GDPR), California Consumer Privacy Act (CCPA), Protection of Personal Information Act (POPIA), and other applicable privacy regulations worldwide.",
				],
			},
		},
		{
			id: "information-collection",
			title: "2. Information We Collect",
			icon: "Database",
			content: {
				subsections: [
					{
						heading: "Personal Information",
						lists: [
							{
								type: "unordered",
								items: [
									"Name and email address for account creation and communication",
									"Payment information (processed securely through trusted payment providers)",
									"Profile preferences and podcast curation settings",
									"Communication preferences and marketing consent",
								],
							},
						],
					},
					{
						heading: "Service Usage Information",
						lists: [
							{
								type: "unordered",
								items: [
									"Podcast selections and listening preferences",
									"AI-generated content interactions and feedback",
									"Service usage patterns and feature preferences",
									"Device information for service optimization",
								],
							},
						],
					},
					{
						heading: "Technical Information",
						lists: [
							{
								type: "unordered",
								items: [
									"IP address and general location data (for service delivery)",
									"Browser type and device information",
									"Performance and error data for service improvement",
									"Analytics data (anonymized where possible)",
								],
							},
						],
					},
				],
			},
		},
		{
			id: "information-usage",
			title: "3. How We Use Your Information",
			icon: "Eye",
			content: {
				paragraphs: [
					"We use your information solely for the following legitimate purposes:",
				],
				lists: [
					{
						type: "unordered",
						items: [
							"Provide and maintain our podcast curation and AI summarization services",
							"Process payments and manage your subscription securely",
							"Personalize your experience and content recommendations",
							"Generate AI-powered summaries based on your preferences",
							"Communicate important service updates and features",
							"Improve our services through anonymized analytics",
							"Ensure security and prevent fraud",
							"Comply with legal obligations and privacy regulations",
						],
					},
				],
				highlight:
					"We will never sell, rent, or trade your personal information to third parties for marketing purposes.",
			},
		},
		{
			id: "data-security",
			title: "4. Data Security and Protection",
			icon: "Lock",
			content: {
				paragraphs: [
					"We implement industry-leading security measures to protect your personal information:",
				],
				lists: [
					{
						type: "unordered",
						items: [
							"End-to-end encryption for data in transit and at rest",
							"Regular security audits and vulnerability assessments",
							"Multi-factor authentication and access controls",
							"Secure payment processing through trusted providers",
							"Employee training on data protection and privacy",
							"Incident response procedures and breach notification protocols",
						],
					},
				],
				highlight:
					"While we implement robust security measures, no method of transmission over the internet is 100% secure. We continuously monitor and improve our security practices.",
			},
		},
		{
			id: "international-transfers",
			title: "5. International Data Transfers",
			icon: "Globe",
			content: {
				paragraphs: [
					"As a global service, your information may be transferred to and processed in countries other than your own. We ensure all international transfers comply with applicable privacy laws:",
				],
				lists: [
					{
						type: "unordered",
						items: [
							"GDPR-compliant transfers using standard contractual clauses",
							"Adequacy decisions and appropriate safeguards",
							"Transparent disclosure of transfer locations",
							"Local data protection authority compliance",
						],
					},
				],
				subsections: [
					{
						paragraphs: [
							"We maintain data processing agreements with all service providers and ensure they meet our privacy standards.",
						],
					},
				],
			},
		},
		{
			id: "privacy-rights",
			title: "6. Your Privacy Rights",
			icon: "FileText",
			content: {
				paragraphs: [
					"You have comprehensive rights regarding your personal information:",
				],
				lists: [
					{
						type: "unordered",
						items: [
							"Access: Request a copy of your personal information",
							"Correction: Update or correct inaccurate information",
							"Deletion: Request deletion of your personal information",
							"Portability: Receive your data in a structured, machine-readable format",
							"Restriction: Limit how we process your information",
							"Objection: Object to certain types of processing",
							"Withdrawal: Withdraw consent for marketing communications",
							"Automated Decisions: Request human review of automated decisions",
						],
					},
				],
				subsections: [
					{
						paragraphs: [
							"To exercise these rights, contact us at jkotzee@icloud.com. We will respond within 30 days.",
						],
					},
				],
			},
		},
		{
			id: "marketing-communications",
			title: "7. Marketing and Communications",
			icon: "Bell",
			content: {
				paragraphs: [
					"We respect your communication preferences and only send marketing communications with your explicit consent:",
				],
				lists: [
					{
						type: "ordered",
						items: [
							"Clear opt-in mechanisms for marketing communications",
							"Easy unsubscribe options in all marketing emails",
							"Granular consent management for different communication types",
							'Respect for "Do Not Track" browser settings',
						],
					},
				],
				subsections: [
					{
						paragraphs: [
							"You can manage your communication preferences in your account settings or contact us directly.",
						],
					},
				],
			},
		},
		{
			id: "data-retention",
			title: "8. Data Retention",
			content: {
				paragraphs: [
					"We retain your personal information only for as long as necessary to fulfill the purposes outlined in this policy:",
				],
				lists: [
					{
						type: "ordered",
						items: [
							"Account data: Retained while your account is active and for 30 days after deletion",
							"Payment information: Retained as required by financial regulations",
							"Usage data: Anonymized after 12 months for service improvement",
							"Marketing data: Retained until you withdraw consent or unsubscribe",
						],
					},
				],
				subsections: [
					{
						paragraphs: [
							"We regularly review and delete data that is no longer necessary for our legitimate business purposes.",
						],
					},
				],
			},
		},
		{
			id: "third-party-sites",
			title: "9. Third Party Sites and External Services",
			content: {
				paragraphs: [
					"This Privacy Notice does not apply to the websites of any other parties, or the applications, products or services, such websites advertise and which may be linked to this Website, or websites that link to or advertise this Website. Podslice is not responsible for the privacy practices of such third party websites.",
					"We carefully select third-party service providers who share our commitment to privacy and transparency. Below are the specific services we use:",
					"We advise you to read the privacy policy of each third party website and decide whether you agree to their privacy practices and policies, as these third party websites may also be collecting or sharing your Personal Information.",
				],
				services: [
					{
						heading: "Authentication Services",
						items: [
							{
								name: "Clerk",
								description:
									"We use Clerk for user authentication and account management. Clerk processes your login credentials, profile information, and authentication data to provide secure access to our services.",
							},
						],
					},
					{
						heading: "Payment Processing",
						items: [
							{
								name: "Paddle",
								description:
									"We use Paddle for secure payment processing and subscription management. Paddle processes your payment information, billing details, and subscription data to facilitate transactions.",
								links: [
									{
										text: "Paddle Privacy Policy",
										url: "https://www.paddle.com/legal/privacy",
									},
									{
										text: "Find Your Purchase & Contact Paddle Support",
										url: "https://paddle.net/find-purchase",
									},
									{
										text: "Verify Your Email with Paddle",
										url: "https://paddle.net/verify-email",
									},
								],
							},
						],
					},
					{
						heading: "Cloud Storage Services",
						items: [
							{
								name: "Google Cloud Services",
								description:
									"We use Google Cloud for secure storage of audio files only. Google Cloud stores podcast audio content and AI-generated audio summaries. No user personal information is stored in Google Cloud services.",
							},
						],
					},
					{
						heading: "Other Service Providers",
						items: [
							{
								name: "Analytics Services",
								description:
									"We use analytics services with privacy-focused configurations for insights and service improvement.",
							},
							{
								name: "Cloud Providers",
								description:
									"We use cloud providers with robust security certifications for infrastructure and data processing.",
							},
						],
					},
				],
			},
		},
		{
			id: "children-privacy",
			title: "10. Children's Privacy",
			content: {
				paragraphs: [
					"Our service is not intended for children under 16 years of age. We do not knowingly collect personal information from children under 16. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.",
				],
			},
		},
		{
			id: "policy-changes",
			title: "11. Changes to This Privacy Policy",
			content: {
				paragraphs: [
					'We may update this Privacy Policy from time to time to reflect changes in our practices or applicable laws. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date. Your continued use of our service after such changes constitutes acceptance of the updated policy.',
				],
			},
		},
		{
			id: "consumer-protection",
			title:
				"12. Consumer Protection Act, Protection of Personal Information Act and Other Laws",
			content: {
				lists: [
					{
						type: "ordered",
						items: [
							'If this Privacy Notice or any provision in this Privacy Notice is regulated by or subject to the Consumer Protection Act, the Protection of Personal Information Act, 2013 ("POPIA") or other laws, it is not intended that any provision of this Privacy Notice contravenes any provision of the Consumer Protection Act, POPIA or such other laws. Therefore all provisions of this Privacy Notice must be treated as being qualified, to the extent necessary, to ensure that the provisions of the Consumer Protection Act, POPIA and such other laws are complied with.',
							"We advise you to read the privacy policy of each third party website and decide whether you agree to their privacy practices and policies, as these third party websites may also be collecting or sharing your Personal Information.",
							"We are not liable if you suffer losses or damages when visiting third party websites by following a link to that website from this Website. You accept that there may be risks when you use such third party websites, and you do so at your own risk.",
						],
					},
				],
				subsections: [
					{
						heading: "No provision of this Privacy Notice:",
						lists: [
							{
								type: "unordered",
								items: [
									"Does or purports to limit or exempt us from any liability (including, without limitation, for any loss directly or indirectly attributable to our gross negligence or wilful default or that of any other person acting for or controlled by us) to the extent that the law does not allow such a limitation or exemption",
									"Requires you to assume risk or liability for the kind of liability or loss, to the extent that the law does not allow such an assumption of risk or liability",
									"Limits or excludes any warranties or obligations which are implied into this Privacy Notice by the Consumer Protection Act (to the extent applicable), POPIA (to the extent applicable), or other applicable laws or which we give under the Consumer Protection Act (to the extent applicable), POPIA (to the extent applicable), or other applicable laws, to the extent that the law does not allow them to be limited or excluded",
								],
							},
						],
					},
				],
			},
		},
		{
			id: "general",
			title: "13. General",
			content: {
				lists: [
					{
						type: "ordered",
						items: [
							"You agree that this Privacy Notice our relationship and any dispute of whatsoever nature relating to or arising out of this Privacy Notice whether directly or indirectly is governed by South African law, without giving effect to any principle of conflict of laws.",
							"Our failure to exercise or enforce any right or provision of this Privacy Notice shall not constitute a waiver of such right or provision.",
							"Each provision of this Privacy Notice, and each part of any provision, is removable and detachable from the others. As far as the law allows, if any provision (or part of a provision) of this Privacy Notice is found by a court or authority of competent jurisdiction to be illegal, invalid or unenforceable (including without limitation, because it is not consistent with the law of another jurisdiction), it must be treated as if it was not included in this Privacy Notice and the rest of this Privacy Notice will still be valid and enforceable.",
							"You may not cede any or all of its rights or delegate any or all of its obligations under these Terms.",
						],
					},
				],
			},
		},
	],
	thirdPartySites: {
		id: "third-party-sites",
		title: "9. Third Party Sites and External Services",
		content: {
			paragraphs: [
				"This Privacy Notice does not apply to the websites of any other parties, or the applications, products or services, such websites advertise and which may be linked to this Website, or websites that link to or advertise this Website. Podslice is not responsible for the privacy practices of such third party websites.",
				"We carefully select third-party service providers who share our commitment to privacy and transparency. Below are the specific services we use:",
				"We advise you to read the privacy policy of each third party website and decide whether you agree to their privacy practices and policies, as these third party websites may also be collecting or sharing your Personal Information.",
			],
			services: [
				{
					heading: "Authentication Services",
					items: [
						{
							name: "Clerk",
							description:
								"We use Clerk for user authentication and account management. Clerk processes your login credentials, profile information, and authentication data to provide secure access to our services.",
						},
					],
				},
				{
					heading: "Payment Processing",
					items: [
						{
							name: "Paddle",
							description:
								"We use Paddle for secure payment processing and subscription management. Paddle processes your payment information, billing details, and subscription data to facilitate transactions.",
							links: [
								{
									text: "Paddle Privacy Policy",
									url: "https://www.paddle.com/legal/privacy",
								},
								{
									text: "Find Your Purchase & Contact Paddle Support",
									url: "https://paddle.net/find-purchase",
								},
								{
									text: "Verify Your Email with Paddle",
									url: "https://paddle.net/verify-email",
								},
							],
						},
					],
				},
				{
					heading: "Cloud Storage Services",
					items: [
						{
							name: "Google Cloud Services",
							description:
								"We use Google Cloud for secure storage of audio files only. Google Cloud stores podcast audio content and AI-generated audio summaries. No user personal information is stored in Google Cloud services.",
						},
					],
				},
				{
					heading: "Other Service Providers",
					items: [
						{
							name: "Analytics Services",
							description:
								"We use analytics services with privacy-focused configurations for insights and service improvement.",
						},
						{
							name: "Cloud Providers",
							description:
								"We use cloud providers with robust security certifications for infrastructure and data processing.",
						},
					],
				},
			],
		},
	},
	contactInfo: {
		heading: "14. Queries and Contact Details of the Information Regulator",
		paragraphs: [
			"Should you feel that your rights in respect of your Personal Information have been infringed, please address your concerns to the Podslice Information Officer at compliance@podslice.ai.",
			"If you feel that the attempts by Podslice to resolve the matter have been inadequate, you may lodge a complaint with the South African Information Regulator by accessing their website at https://inforegulator.org.za/.",
		],
		details: {
			name: "The Podslice Team",
			email: "compliance@podslice.ai",
			website: "www.podslice.ai",
		},
	},
	footer: {
		acknowledgment:
			"This Privacy Policy is effective as of the last updated date and applies to all users of our service worldwide.",
		termsLinkText: "View our Terms of Service",
	},
};
