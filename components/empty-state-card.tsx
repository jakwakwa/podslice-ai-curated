import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EmptyStateCardProps {
	title: string;
	message: {
		description: string;
		notificationTitle: string;
		notificationDescription: string;
		selectStateActionText: string;
	};
	selectStateAction?: () => void;
}

const EmptyStateCard = ({ title, message, selectStateAction }: EmptyStateCardProps): React.ReactElement => {
	return (
		<Card className="bg-card">
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-xl font-semibold tracking-tight mt-2 mb-2">{title}</CardTitle>
			</CardHeader>
			<CardContent>
				<Alert className="bg-slate-500/40">
					<AlertCircle className="h-4 w-4" />
					<AlertTitle>{message.notificationTitle}</AlertTitle>
					<AlertDescription className="text-[11px] leading-6 font-normal tracking-[0.025em] mt-2 mb-4 text-foreground/60">{message.description}</AlertDescription>
				</Alert>
				{selectStateAction && (
					<div className="mt-6 text-center">
						<Button variant="default" onClick={selectStateAction}>
							{message.selectStateActionText}
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
};

export default EmptyStateCard;
