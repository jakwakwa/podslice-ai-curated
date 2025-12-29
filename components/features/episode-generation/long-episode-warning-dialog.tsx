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
						<AlertCircle className="h-8 w-8 text-purple-500" />
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
									<p>
										The <strong>Deep Dive</strong> option creates a more comprehensive
										7-10 minute summary, but it counts as <strong>2 episodes</strong>{" "}
										towards your monthly limit.
									</p>
									<div className="px-3  py-1 border-2 border-emerald-500/50 rounded-lg">
										<p className="font-semibold text-slate-900">
											Current status: {remainingCredits} credits remaining
										</p>
										<p className="text-sm text-muted-foreground mt-1">
											After creating this episode, you'll have {remainingCredits - 2}{" "}
											credits left.
										</p>
									</div>
									<p>Would you like to continue?</p>
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
