import type { Metadata } from "next";
import LegalPageLayout from "@/components/shared/legal-page-layout";
import LegalSection from "@/components/shared/legal-section";
import LegalContactInfo from "@/components/shared/legal-contact-info";
import LegalFooter from "@/components/shared/legal-footer";
import { termsContent } from "./content";

export const metadata: Metadata = {
	title: "Terms of Service | PodSlice",
	description: "Terms of Service for PodSlice AI-powered podcast curation platform",
};

export default function TermsPage() {
	const { lastUpdated, pageTitle, sections, contactInfo, footer } = termsContent;

	return (
		<LegalPageLayout pageTitle={pageTitle} lastUpdated={lastUpdated}>
			{/* Render all sections */}
			{sections.map(section => (
				<LegalSection key={section.id} title={section.title} content={section.content} />
			))}

			{/* Contact Information Section */}
			<LegalContactInfo
				heading={contactInfo.heading}
				paragraphs={contactInfo.paragraphs}
				details={contactInfo.details}
			/>

			{/* Footer */}
			<LegalFooter
				acknowledgment={footer.acknowledgment}
				linkText={footer.privacyLinkText}
				linkHref="/privacy"
			/>
		</LegalPageLayout>
	);
}
