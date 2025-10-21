import type { Metadata } from "next";
import Link from "next/link";
import LegalPageLayout from "@/components/shared/legal-page-layout";
import LegalSection from "@/components/shared/legal-section";
import { privacyContent } from "./content";

export const metadata: Metadata = {
  title: "Privacy Policy | PodSlice",
  description:
    "Privacy Policy for PodSlice AI-powered podcast curation platform",
};

export default function PrivacyPage() {
  const {
    lastUpdated,
    pageTitle,
    sections,
    thirdPartySites,
    contactInfo,
    footer,
  } = privacyContent;

  return (
    <LegalPageLayout pageTitle={pageTitle} lastUpdated={lastUpdated}>
      {/* Render all standard sections */}
      {sections.map((section) => (
        <LegalSection
          key={section.id}
          title={section.title}
          icon={section.icon}
          content={section.content}
        />
      ))}

      {/* Third Party Sites Section - Custom rendering for service listings */}
      <div className="mb-8">
        <LegalSection
          title={thirdPartySites.title}
          content={{
            paragraphs: thirdPartySites.content.paragraphs,
          }}
        />

        {/* Services listing */}
        <div className="mt-6 space-y-6">
          {thirdPartySites.content.services.map((service, serviceIndex) => (
            <div key={`service-${serviceIndex}`}>
              <h4 className="font-bold text-lg mb-3">{service.heading}</h4>
              <div className="space-y-4">
                {service.items.map((item, itemIndex) => (
                  <div key={`service-item-${itemIndex}`} className="ml-4">
                    <p className="mb-2">
                      <strong>{item.name}</strong> - {item.description}
                    </p>
                    {item.links && item.links.length > 0 && (
                      <ul className="list-disc pl-6 space-y-2 mt-2">
                        {item.links.map((link, linkIndex) => (
                          <li key={`link-${linkIndex}`}>
                            <Link
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-forefround hover:underline text-teal-400/60 font-medium underline"
                            >
                              {link.text}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-sm text-foreground/90">
          We maintain data processing agreements with all service providers and
          ensure they meet our privacy standards. We do not sell, rent, or trade
          your personal information to third parties for marketing purposes.
        </p>
      </div>

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
            href="/terms"
            className="text-xs text-primary-forefround hover:underline"
          >
            {footer.termsLinkText}
          </Link>
        </div>
      </div>
    </LegalPageLayout>
  );
}
