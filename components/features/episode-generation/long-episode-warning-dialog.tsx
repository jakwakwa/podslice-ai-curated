"use client";

import { AlertCircle } from "lucide-react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface LongEpisodeWarningDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
	remainingCredits: number;
}

export function LongEpisodeWarningDialog({
	open,
	onOpenChange,
	onConfirm,
	remainingCredits,
}: LongEpisodeWarningDialogProps) {
	const hasEnoughCredits = remainingCredits >= 2;

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<div className="flex items-center gap-3 mb-2">
						<AlertCircle className="animate-bounce h-5 w-5 text-amber-500" />
						<AlertDialogTitle>
							{hasEnoughCredits
								? "Deep Dive Uses 2 Episode Credits"
								: "Insufficient Credits"}
						</AlertDialogTitle>
					</div>
					<AlertDialogDescription asChild>
						<div className="space-y-3 text-base text-muted-foreground">
							{hasEnoughCredits ? (
								<>
									<div>
										<p className="font-semibold text-amber-200 mt-4">
											After creating this episode, you'll have {remainingCredits - 2}{" "}
											credits left.
										</p>
									</div>
									<p className="my-4 text-gray-300 font-bold text-lg">
										Would you like to continue?
									</p>
								</>
							) : (
								<>
									<p>
										The <strong>Deep Dive</strong> option requires 2 episode credits, but
										you only have{" "}
										<strong>
											{remainingCredits} credit{remainingCredits !== 1 ? "s" : ""}
										</strong>{" "}
										remaining.
									</p>
									<p className="text-sm">
										Please choose a shorter length or upgrade your plan for more episodes.
									</p>
								</>
							)}
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>{hasEnoughCredits ? "Cancel" : "Close"}</AlertDialogCancel>
					{hasEnoughCredits && (
						<AlertDialogAction onClick={onConfirm} className="bg-primary">
							Yes, Use 2 Credits
						</AlertDialogAction>
					)}
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
