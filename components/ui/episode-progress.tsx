"use client";

import { CheckCircle, Clock, XCircle } from "lucide-react";
import { useEffect } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useEpisodeProgress } from "@/hooks/useEpisodeProgress";

interface EpisodeProgressProps {
	episodeId: string;
	onComplete?: () => void;
	onError?: (error: string) => void;
}

export function EpisodeProgress({
	episodeId,
	onComplete,
	onError,
}: EpisodeProgressProps) {
	const { status, isPolling, error, isCompleted, isFailed, isInProgress } =
		useEpisodeProgress(episodeId);

	// Call callbacks when status changes
	useEffect(() => {
		if (isCompleted && onComplete) {
			onComplete();
		}
	}, [isCompleted, onComplete]);

	useEffect(() => {
		if (error && onError) {
			onError(error);
		}
	}, [error, onError]);

	if (!status) {
		return (
			<Card>
				<CardContent className="pt-6">
					<div className="flex items-center space-x-2">
						<Clock className="h-4 w-4 animate-spin" />
						<span>Loading episode status...</span>
					</div>
				</CardContent>
			</Card>
		);
	}

	const progressPercentage = (status.progress.step / status.progress.total) * 100;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center space-x-2">
					{isCompleted && <CheckCircle className="h-5 w-5 text-green-500" />}
					{isFailed && <XCircle className="h-5 w-5 text-red-500" />}
					{isInProgress && <Clock className="h-5 w-5 text-blue-500 animate-pulse" />}
					<span>{status.episode_title}</span>
				</CardTitle>
				<CardDescription>{status.progress.message}</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-2">
					<Progress value={progressPercentage} className="w-full" />
					<div className="flex justify-between text-sm text-muted-foreground">
						<span>
							Step {status.progress.step} of {status.progress.total}
						</span>
						<span>{Math.round(progressPercentage)}%</span>
					</div>
					{isPolling && (
						<div className="text-xs text-blue-600 flex items-center space-x-1">
							<Clock className="h-3 w-3 animate-spin" />
							<span>Checking progress...</span>
						</div>
					)}
					{isCompleted && status.gcs_audio_url && (
						<div className="text-xs text-green-600">
							✓ Audio file ready at {new Date(status.updated_at).toLocaleTimeString()}
						</div>
					)}
					{isFailed && (
						<div className="text-xs text-red-600">
							✗ Generation failed at {new Date(status.updated_at).toLocaleTimeString()}
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
