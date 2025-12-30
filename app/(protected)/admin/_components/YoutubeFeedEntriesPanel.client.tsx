"use client";

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import Link from "next/link";

type EntryRow = {
	id: string;
	userId: string;
	userEmail: string | null;
	videoTitle: string;
	videoUrl: string;
	publishedDate: string | null; // ISO
	fetchedAt: string; // ISO
};

export default function YoutubeFeedEntriesPanelClient({
	entries,
}: {
	entries: EntryRow[];
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Latest Entries ({entries.length})</CardTitle>
				<CardDescription>
					Recent items fetched by the YouTube RSS cron job
				</CardDescription>
			</CardHeader>
			<CardContent className="overflow-x-auto">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Fetched</TableHead>
							<TableHead>Published</TableHead>
							<TableHead>Title</TableHead>
							<TableHead>URL</TableHead>
							<TableHead>User</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{entries.map(e => (
							<TableRow key={e.id}>
								<TableCell className="whitespace-nowrap">
									{formatDateTime(e.fetchedAt)}
								</TableCell>
								<TableCell className="whitespace-nowrap">
									{e.publishedDate ? formatDateTime(e.publishedDate) : "—"}
								</TableCell>
								<TableCell className="max-w-[24rem] truncate" title={e.videoTitle}>
									{e.videoTitle}
								</TableCell>
								<TableCell className="max-w-[24rem] truncate">
									<Link
										href={e.videoUrl}
										className="text-link hover:text-link-hover"
										target="_blank"
										rel="noreferrer">
										{e.videoUrl}
									</Link>
								</TableCell>
								<TableCell className="whitespace-nowrap">
									{e.userEmail ?? e.userId}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}

function formatDateTime(iso: string): string {
	try {
		const d = new Date(iso);
		return d.toLocaleString();
	} catch {
		return iso;
	}
}
