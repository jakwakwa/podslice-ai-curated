"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export default function AdminPodcastsError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error("[Admin Podcasts] error boundary:", error);
	}, [error]);

	return (
		<div className="container mx-auto p-6 max-w-6xl">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<AlertTriangle className="w-4 h-4 text-destructive" />
						Something went wrong
					</CardTitle>
					<CardDescription>We couldn't load podcasts. Please try again.</CardDescription>
				</CardHeader>
				<CardContent className="flex items-center gap-2">
					<Button variant="default" onClick={() => reset()}>
						Try again
					</Button>
					<Button variant="outline" onClick={() => location.reload()}>
						Reload page
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
