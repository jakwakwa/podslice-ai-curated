import { Bell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
	title: string;
	description: string;
}

export default function NotificationsEmptyState({ title, description }: EmptyStateProps) {
	return (
		<Card className="text-center px-0 py-18 mt-8 border-2 border-dashed border-border bg-card content">
			<CardContent className="flex flex-col items-center gap-4">
				<Bell className="w-8 h-8 text-muted-foreground opacity-50" />
				<h3 className="text-xl font-semibold text-foreground m-0">{title}</h3>
				<p className="text-muted-foreground max-w-md text-base m-0">{description}</p>
			</CardContent>
		</Card>
	);
}
