"use client";

import { useState } from "react";
import { AudioPlayerSheet } from "@/components/ui/audio-player-sheet/AudioPlayerSheet";
import { Button } from "@/components/ui/button";

// No dummy data - component ready for real episode data

import type { JSX } from "react";

export function SheetShowcase(): JSX.Element {
	const [open, setOpen] = useState(false);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center gap-3">
				<Button variant="default" onClick={() => setOpen(true)}>
					Open AudioPlayerSheet
				</Button>
				<span className="text-sm opacity-70">Opens from the right using Sheet</span>
			</div>
			{/* AudioPlayerSheet ready for real episode data */}
			<AudioPlayerSheet open={open} onOpenChange={setOpen} episode={null} />
		</div>
	);
}
