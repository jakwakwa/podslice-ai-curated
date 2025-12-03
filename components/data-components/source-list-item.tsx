"use client";

import Image from "next/image";
import type { Source } from "@/lib/types";
import { Card } from "../ui/card";

export function SourceListItem({ source }: { source: Source }) {
	return (
		<Card variant="glass" className="flex flex-col items-center gap-4 p-4">
			<div className="w-full max-w-[200px] md:max-w-[100px] lg:max-w-[150px] p-0">
				<Image
					src={source.image_url || "/placeholder.svg"}
					alt={`${source.name} cover art`}
					width={80}
					height={80}
					className="rounded-sm border p-0"
				/>
			</div>
			<div className="w-full flex flex-col justify-start">
				<p className="text-xs">{source.name}</p>
				<p className="text-xs text-muted-foreground truncate">{source.url}</p>
			</div>
		</Card>
	);
}
