import type React from "react";
import Link from "next/link";
import LegalSection from "./legal-section";

interface ServiceLink {
    text: string;
    url: string;
}

interface ServiceItem {
    name: string;
    description: string;
    links?: ServiceLink[];
}

interface ServiceCategory {
    heading: string;
    items: ServiceItem[];
}

interface ThirdPartyServicesSectionProps {
    title: string;
    paragraphs: string[];
    services: ServiceCategory[];
}

/**
 * Reusable component for displaying third-party services information
 */
const ThirdPartyServicesSection = ({
    title,
    paragraphs,
    services,
}: ThirdPartyServicesSectionProps) => {
    return (
        <div className="mb-8">
            <LegalSection
                title={title}
                content={{
                    paragraphs,
                }}
            />

            {/* Services listing */}
            <div className="mt-6 space-y-6">
                {services.map((service, serviceIndex) => (
                    <div key={`service-${serviceIndex}`}>
                        <h4 className="font-bold text-lg mb-3 text-foreground">
                            {service.heading}
                        </h4>
                        <div className="space-y-4">
                            {service.items.map((item, itemIndex) => (
                                <div
                                    key={`service-item-${itemIndex}`}
                                    className="ml-4 text-foreground/90"
                                >
                                    <p className="mb-2 text-sm">
                                        <strong className="text-foreground">{item.name}</strong> -{" "}
                                        {item.description}
                                    </p>
                                    {item.links && item.links.length > 0 && (
                                        <ul className="list-disc pl-6 space-y-2 mt-2">
                                            {item.links.map((link, linkIndex) => (
                                                <li key={`link-${linkIndex}`}>
                                                    <Link
                                                        href={link.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary hover:text-primary/80 font-medium underline transition-colors text-sm"
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

            <p className="mt-6 text-sm text-foreground/90 leading-relaxed">
                We maintain data processing agreements with all service providers and
                ensure they meet our privacy standards. We do not sell, rent, or trade
                your personal information to third parties for marketing purposes.
            </p>
        </div>
    );
};

export default ThirdPartyServicesSection;

