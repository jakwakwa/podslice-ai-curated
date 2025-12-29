"use client";

import { useState } from "react";
// CSS module migrated to Tailwind classes
import { Button } from "./ui/button";

export function EpisodeTranscript({ transcript }: { transcript: string }) {
	const [show, setShow] = useState(false);
	return (
		<div className="mt-4">
			{!show ? (
				<Button
					className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700"
					onClick={() => setShow(true)}
					variant="default">
					Show transcript
				</Button>
			) : (
				<div className="max-h-[25rem] overflow-y-auto border rounded p-2 bg-background/20  mt-2 whitespace-pre-line">
					{transcript}
				</div>
			)}
		</div>
	);
}
