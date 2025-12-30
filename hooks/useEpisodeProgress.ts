import { useEffect, useState } from "react";
import { useNotificationStore } from "@/lib/stores";

interface EpisodeProgress {
	step: number;
	total: number;
	message: string;
}

interface EpisodeStatus {
	episode_id: string;
	episode_title: string;
	status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
	gcs_audio_url: string | null;
	summary: string | null;
	created_at: string;
	updated_at: string;
	progress: EpisodeProgress;
}

export function useEpisodeProgress(episodeId: string | null) {
	const [status, setStatus] = useState<EpisodeStatus | null>(null);
	const [isPolling, setIsPolling] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const { loadNotifications } = useNotificationStore();

	useEffect(() => {
		if (!episodeId) {
			setStatus(null);
			setIsPolling(false);
			return;
		}

		let intervalId: NodeJS.Timeout | null = null;
		let isMounted = true;

		const pollStatus = async () => {
			try {
				const response = await fetch(`/api/user-episodes/${episodeId}/status`);
				if (!response.ok) {
					throw new Error(`HTTP ${response.status}`);
				}

				const data = await response.json();

				if (isMounted) {
					setStatus(data);
					setError(null);

					// Stop polling if completed or failed
					if (data.status === "COMPLETED" || data.status === "FAILED") {
						setIsPolling(false);
						if (intervalId) {
							clearInterval(intervalId);
						}
						// Fetch notifications once to surface episode_ready
						void loadNotifications();
					}
				}
			} catch (err) {
				if (isMounted) {
					setError(err instanceof Error ? err.message : "Failed to check status");
				}
			}
		};

		// Start polling
		setIsPolling(true);
		pollStatus(); // Initial call

		// Poll every 2 seconds
		intervalId = setInterval(pollStatus, 2000);

		return () => {
			isMounted = false;
			if (intervalId) {
				clearInterval(intervalId);
			}
		};
	}, [episodeId, loadNotifications]);

	return {
		status,
		isPolling,
		error,
		isCompleted: status?.status === "COMPLETED",
		isFailed: status?.status === "FAILED",
		isInProgress: status?.status === "PENDING" || status?.status === "PROCESSING",
	};
}
