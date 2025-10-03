import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PanelHeaderProps {
	title: string | ReactNode;
	description: string;
	actionButton?: {
		label: string;
		onClick: () => void;
		disabled?: boolean;
	};
	secondaryButton?: {
		label: string;
		onClick: () => void;
		variant?: "outline" | "ghost" | "default";
		size?: "sm" | "default" | "md";
	};
}

export default function PanelHeader({ title, description, actionButton, secondaryButton }: PanelHeaderProps) {
	return (
		<CardHeader className="flex flex-col md:flex-row md:items-center justify-between">
			<div>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</div>
			<div className="flex items-center gap-2">
				{secondaryButton && (
					<Button variant={secondaryButton.variant || "outline"} size={secondaryButton.size || "sm"} onClick={secondaryButton.onClick}>
						{secondaryButton.label}
					</Button>
				)}
				{actionButton && (
					<Button variant="outline" size="sm" onClick={actionButton.onClick} disabled={actionButton.disabled}>
						{actionButton.label}
					</Button>
				)}
			</div>
		</CardHeader>
	);
}
