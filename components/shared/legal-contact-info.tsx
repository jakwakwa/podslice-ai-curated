import Link from "next/link";
import LegalSection from "./legal-section";

interface ContactDetails {
	name: string;
	email: string;
	website: string;
}

interface LegalContactInfoProps {
	heading: string;
	paragraphs: string[];
	details: ContactDetails;
}

/**
 * Reusable contact information component for legal pages
 */
const LegalContactInfo = ({ heading, paragraphs, details }: LegalContactInfoProps) => {
	return (
		<div className="mb-8">
			<LegalSection
				title={heading}
				content={{
					paragraphs,
				}}
			/>
			<div className="mt-4 p-4 bg-background/20  rounded-lg border border-border">
				<p className="font-semibold text-base text-foreground">{details.name}</p>
				<p className="text-sm text-foreground/90">Email: {details.email}</p>
				<p className="text-sm text-foreground/90">
					Website:{" "}
					<Link
						href="/"
						className="text-primary hover:text-primary/80 hover:underline transition-colors">
						{details.website}
					</Link>
				</p>
			</div>
		</div>
	);
};

export default LegalContactInfo;
