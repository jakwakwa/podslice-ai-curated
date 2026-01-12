"use client";

import { AudioPlayerSheet } from "@/components/ui/audio-player-sheet/AudioPlayerSheet";
import { useAudioPlayerStore } from "@/store/audioPlayerStore";

export function GlobalAudioPlayerSheet() {
	const { episode, isSheetOpen, closeSheet } = useAudioPlayerStore();

	return (
		<AudioPlayerSheet
			open={isSheetOpen}
			onOpenChange={open => {
				if (!open) {
					closeSheet();
				}
			}}
			episode={episode}
			onClose={closeSheet}
		/>
	);
}
