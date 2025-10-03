"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import styles from "./episode-transcripts.module.css";

export function EpisodeTranscript({ transcript }: { transcript: string }) {
	const [show, setShow] = useState(false);
	return (
		<div className={styles.transcriptContainer}>
			{!show ? (
				<Button className={styles.showTranscriptButton} onClick={() => setShow(true)} variant="default">
					Show transcript
				</Button>
			) : (
				<div className={styles.transcriptContent}>{transcript}</div>
			)}
		</div>
	);
}
