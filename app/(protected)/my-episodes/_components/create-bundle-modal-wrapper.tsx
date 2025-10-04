"use client";

import { useEffect, useState } from "react";
import { CreateBundleModal } from "@/components/features/shared-bundles/create-bundle-modal";
import type { UserEpisode } from "@/lib/types";
import { useRouter } from "next/navigation";

type UserEpisodeWithSignedUrl = UserEpisode & { signedAudioUrl?: string | null };

export function CreateBundleModalWrapper() {
	const [episodes, setEpisodes] = useState<UserEpisodeWithSignedUrl[]>([]);
	const router = useRouter();

	useEffect(() => {
		const fetchEpisodes = async () => {
			try {
				const res = await fetch("/api/user-episodes/list");
				if (!res.ok) return;
				const data: UserEpisodeWithSignedUrl[] = await res.json();
				setEpisodes(data.filter((e) => e.status === "COMPLETED"));
			} catch (error) {
				console.error("[FETCH_EPISODES]", error);
			}
		};

		fetchEpisodes();
	}, []);

	const handleSuccess = (bundleId: string) => {
		// Navigate to bundle management page once created
		router.push(`/my-bundles`);
	};

	return <CreateBundleModal allUserEpisodes={episodes} onSuccess={handleSuccess} />;
}
