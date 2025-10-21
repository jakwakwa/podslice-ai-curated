import type { Metadata } from "next";
import Link from "next/link";
import LegalPageLayout from "@/components/shared/legal-page-layout";
import LegalSection from "@/components/shared/legal-section";
import { termsContent } from "./content";

export const metadata: Metadata = {
  title: "Terms of Service | PodSlice",
  description:
    "Terms of Service for PodSlice AI-powered podcast curation platform",
};

export default function TermsPage() {
  const { lastUpdated, pageTitle, sections, contactInfo, footer } =
    termsContent;

  return (
    <LegalPageLayout pageTitle={pageTitle} lastUpdated={lastUpdated}>
      {/* Render all sections */}
      {sections.map((section) => (
        <LegalSection
          key={section.id}
          title={section.title}
          content={section.content}
        />
      ))}

      {/* Contact Information Section */}
      <div className="mb-8">
        <LegalSection
          title={contactInfo.heading}
          content={{
            paragraphs: contactInfo.paragraphs,
          }}
        />
        <div className="mt-4 p-4 bg-background rounded-lg border">
          <p className="font-semibold text-custom-h5">
            {contactInfo.details.name}
          </p>
          <p>Email: {contactInfo.details.email}</p>
          <p>
            Website:{" "}
            <Link href="/" className="text-primary-forefround hover:underline">
              {contactInfo.details.website}
            </Link>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-left mt-4 pt-8 border-t">
        <p className="text-base text-muted-foreground">
          {footer.acknowledgment}
        </p>
        <div className="mt-4">
          <Link
            href="/privacy"
            className="text-xs text-primary-forefround hover:underline"
          >
            {footer.privacyLinkText}
          </Link>
        </div>
      </div>
    </LegalPageLayout>
  );
}
