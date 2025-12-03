import type { Source } from "@/lib/types";
import { Card } from "../ui/card";
import { SourceListItem } from "./source-list-item";

interface SourceListProps {
	sources: Source[];
}

export function SourceList({ sources }: SourceListProps) {
	if (sources.length === 0) {
		return <Card className="text-center text-sm">No sources added yet.</Card>;
	}

	return (
		<div className="flex flex-col gap-4">
			{sources.map(source => (
				<SourceListItem key={source.id} source={source} />
			))}
		</div>
	);
}
