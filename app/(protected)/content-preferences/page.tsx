import CommonSectionWithChildren from "@/components/shared/section-common";
import { PageHeader } from "@/components/ui/page-header";
import { ContentPreferencesClient } from "./_components/content-preferences-client";
import { contentPreferencesContent } from "./content";

export default function ContentPreferencesPage() {
	const { page, section } = contentPreferencesContent;
	return (
		<div className="w-full flex flex-col gap-4">
			<PageHeader title={page.title} description={page.description} />
			<CommonSectionWithChildren title={section.title} description={section.description}>
				<ContentPreferencesClient content={contentPreferencesContent} />
			</CommonSectionWithChildren>
		</div>
	);
}
