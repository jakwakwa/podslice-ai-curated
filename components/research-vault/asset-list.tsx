import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { AddAssetDialog } from "./add-asset-dialog";

interface AssetListProps {
	userId: string;
}

export async function AssetList({ userId }: AssetListProps) {
	const assets = await prisma.researchAsset.findMany({
		where: { userId },
		orderBy: { createdAt: "desc" },
	});

	if (assets.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg bg-muted/50">
				<h3 className="text-lg font-medium mb-2">No Assets Found</h3>
				<p className="text-muted-foreground mb-4 text-center max-w-sm">
					Your vault is empty. Add documents to help the AI understand your specific
					context.
				</p>
				<AddAssetDialog userId={userId} />
			</div>
		);
	}

	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{assets.map(asset => (
				<Card key={asset.id} className="flex flex-col">
					<CardHeader>
						<div className="flex justify-between items-start gap-2">
							<Badge variant="outline" className="mb-2">
								{asset.assetType.replace("_", " ")}
							</Badge>
							<Link
								href={asset.sourceUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="text-muted-foreground hover:text-primary transition-colors"
								title="Open Source">
								<ExternalLink className="h-4 w-4" />
							</Link>
						</div>
						<CardTitle className="line-clamp-2 leading-tight">{asset.title}</CardTitle>
						<CardDescription className="line-clamp-3 mt-2">
							{asset.description || "No description provided."}
						</CardDescription>
						{asset.tags.length > 0 && (
							<div className="flex flex-wrap gap-1 mt-3">
								{asset.tags.slice(0, 3).map(tag => (
									<Badge key={tag} variant="secondary" className="text-xs">
										{tag}
									</Badge>
								))}
								{asset.tags.length > 3 && (
									<span className="text-xs text-muted-foreground ml-1">
										+{asset.tags.length - 3} more
									</span>
								)}
							</div>
						)}
					</CardHeader>
				</Card>
			))}
		</div>
	);
}
