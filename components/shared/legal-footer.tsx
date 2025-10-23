
import Link from "next/link";

interface LegalFooterProps {
    acknowledgment: string;
    linkText: string;
    linkHref: "/privacy" | "/terms";
}

/**
 * Reusable footer component for legal pages
 */
const LegalFooter = ({
    acknowledgment,
    linkText,
    linkHref,
}: LegalFooterProps) => {
    return (
        <div className="text-left mt-8 pt-8 border-t border-border">
            <p className="text-base text-muted-foreground leading-relaxed">
                {acknowledgment}
            </p>
            <div className="mt-4">
                <Link
                    href={linkHref}
                    className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
                >
                    {linkText}
                </Link>
            </div>
        </div>
    );
};

export default LegalFooter;

