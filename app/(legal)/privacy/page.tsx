import type { Metadata } from "next";
import LegalContactInfo from "@/components/shared/legal-contact-info";
import LegalFooter from "@/components/shared/legal-footer";
import LegalPageLayout from "@/components/shared/legal-page-layout";
import LegalSection from "@/components/shared/legal-section";
import ThirdPartyServicesSection from "@/components/shared/third-party-services-section";
import { privacyContent } from "./content";

export const metadata: Metadata = {
	title: "Privacy Policy | PodSlice",
	description: "Privacy Policy for PodSlice AI-powered podcast curation platform",
};

export default function PrivacyPage() {
	const { lastUpdated, pageTitle, sections, thirdPartySites, contactInfo, footer } =
		privacyContent;

	return (
		<LegalPageLayout pageTitle={pageTitle} lastUpdated={lastUpdated}>
			{/* Render all standard sections */}
			{sections.map(section => (
				<LegalSection
					key={section.id}
					title={section.title}
					icon={section.icon}
					content={section.content}
				/>
			))}

			{/* Third Party Sites Section */}
			<ThirdPartyServicesSection
				title={thirdPartySites.title}
				paragraphs={thirdPartySites.content.paragraphs}
				services={thirdPartySites.content.services}
			/>

			{/* Contact Information Section */}
			<LegalContactInfo
				heading={contactInfo.heading}
				paragraphs={contactInfo.paragraphs}
				details={contactInfo.details}
			/>

			{/* Footer */}
			<LegalFooter
				acknowledgment={footer.acknowledgment}
				linkText={footer.termsLinkText}
				linkHref="/terms"
			/>
		</LegalPageLayout>
	);
}
