"use client";

import { format } from "date-fns";
import { FileText, Globe, Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { getUserAssets } from "@/app/actions/research-vault";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Asset {
	id: string;
	title: string;
	assetType: string;
	sourceUrl: string;
	createdAt: Date;
}

interface SelectAssetDialogProps {
	onSelect: (asset: Asset) => void;
	trigger?: React.ReactNode;
}

export function SelectAssetDialog({ onSelect, trigger }: SelectAssetDialogProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [assets, setAssets] = useState<Asset[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");

	useEffect(() => {
		if (isOpen) {
			setIsLoading(true);
			getUserAssets()
				.then(setAssets)
				.catch(console.error)
				.finally(() => setIsLoading(false));
		}
	}, [isOpen]);

	const filteredAssets = assets.filter(asset =>
		asset.title.toLowerCase().includes(searchQuery.toLowerCase())
	);

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				{trigger || <Button variant="outline">Select from Vault</Button>}
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Select Research Asset</DialogTitle>
					<DialogDescription>
						Choose a document or link from your vault to use as context.
					</DialogDescription>
				</DialogHeader>
				<div className="py-2">
					<div className="relative">
						<Search
							color="#000"
							className="absolute right-4 top-4 h-4 w-4 hover:text-primary"
						/>
						<Input
							placeholder="Search assets..."
							value={searchQuery}
							onChange={e => setSearchQuery(e.target.value)}
							className="pl-8"
						/>
					</div>
				</div>
				<ScrollArea className="h-[300px] w-full rounded-md border p-4">
					{isLoading ? (
						<div className="flex h-full items-center justify-center">
							<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
						</div>
					) : filteredAssets.length === 0 ? (
						<div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
							<p>No assets found.</p>
						</div>
					) : (
						<div className="space-y-2">
							{filteredAssets.map(asset => (
								// biome-ignore lint/a11y/noStaticElementInteractions: <unresolved>
								<div
									key={asset.id}
									className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent cursor-pointer transition-colors"
									onClick={() => {
										onSelect(asset);
										setIsOpen(false);
									}}>
									<div className="flex items-center gap-3 overflow-hidden">
										<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
											{asset.assetType === "URL" ? (
												<Globe className="h-4 w-4 text-primary" />
											) : (
												<FileText className="h-4 w-4 text-primary" />
											)}
										</div>
										<div className="flex flex-col overflow-hidden">
											<span className="truncate text-sm font-medium">{asset.title}</span>
											<span className="text-xs text-muted-foreground">
												{format(new Date(asset.createdAt), "MMM d, yyyy")} •{" "}
												{asset.assetType}
											</span>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</ScrollArea>
			</DialogContent>
		</Dialog>
	);
}
