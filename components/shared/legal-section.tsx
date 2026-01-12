import type React from "react";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Database, Eye, FileText, Globe, Lock, Shield } from "lucide-react";

interface ListItem {
	type: "unordered" | "ordered";
	items: string[];
}

interface Subsection {
	heading?: string;
	paragraphs?: string[];
	lists?: ListItem[];
}

interface SectionContent {
	paragraphs?: string[];
	subsections?: Subsection[];
	lists?: ListItem[];
	highlight?: string;
}

interface LegalSectionProps {
	title: string;
	icon?: string;
	content: SectionContent;
	className?: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
	Shield,
	Database,
	Eye,
	Lock,
	Globe,
	FileText,
	Bell,
};

const LegalSection = ({ title, icon, content, className = "" }: LegalSectionProps) => {
	const IconComponent = icon ? iconMap[icon] : null;

	return (
		<div className={`mb-8 ${className}`}>
			<CardHeader className="my-4 text-xl font-bold">
				<CardTitle className={icon ? "flex items-center gap-2" : ""}>
					{IconComponent && <IconComponent className="h-5 w-5" />}
					{title}
				</CardTitle>
			</CardHeader>
			<div className="text-foreground/90 text-base leading-relaxed">
				{/* Main paragraphs */}
				{content.paragraphs?.map((paragraph, index) => (
					<p key={`para-${index}`} className="font-sans text-sm mb-4">
						{paragraph}
					</p>
				))}

				{/* Subsections */}
				{content.subsections?.map((subsection, subIndex) => (
					<div key={`subsection-${subIndex}`} className="mb-4">
						{subsection.heading && (
							<h4 className="font-semibold text-sm mb-2">{subsection.heading}</h4>
						)}
						{subsection.paragraphs?.map((para, paraIndex) => (
							<p key={`sub-para-${paraIndex}`} className="mb-2">
								{para}
							</p>
						))}
						{subsection.lists?.map((list, listIndex) => (
							<div key={`sub-list-${listIndex}`}>
								{list.type === "unordered" ? (
									<ul className="list-disc pl-6 space-y-2 mb-4">
										{list.items.map((item, itemIndex) => (
											<li className="text-xs" key={`sub-list-item-${itemIndex}`}>
												{item}
											</li>
										))}
									</ul>
								) : (
									<ol className="list-decimal pl-6 text-xs space-y-2 mb-4">
										{list.items.map((item, itemIndex) => (
											<li className="text-xs" key={`sub-list-item-${itemIndex}`}>
												{item}
											</li>
										))}
									</ol>
								)}
							</div>
						))}
					</div>
				))}

				{/* Main lists */}
				{content.lists?.map((list, listIndex) => (
					<div key={`list-${listIndex}`}>
						{list.type === "unordered" ? (
							<ul className="list-disc pl-6 space-y-2 mb-4">
								{list.items.map((item, itemIndex) => (
									<li className="text-sm" key={`list-item-${itemIndex}`}>
										{item}
									</li>
								))}
							</ul>
						) : (
							<ol className="list-decimal pl-6 space-y-2 mb-4">
								{list.items.map((item, itemIndex) => (
									<li className="text-sm" key={`list-item-${itemIndex}`}>
										{item}
									</li>
								))}
							</ol>
						)}
					</div>
				))}

				{/* Highlight text */}
				{content.highlight && (
					<p className="mt-4 text-base bg-indigo-400/10 text-indigo-400 px-3 py-1 rounded-sm">
						{content.highlight}
					</p>
				)}
			</div>
		</div>
	);
};

export default LegalSection;
