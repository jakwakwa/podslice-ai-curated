"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveResearchAsset } from "@/app/actions/research-vault";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface AddAssetDialogProps {
	userId: string;
}

export function AddAssetDialog({ userId }: AddAssetDialogProps) {
	const [open, setOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const router = useRouter();

	async function onSubmit(formData: FormData) {
		startTransition(async () => {
			const result = await saveResearchAsset(formData);

			if (result.error) {
				toast.error(result.error);
			} else {
				toast.success("Asset saved to vault");
				setOpen(false);
				router.refresh();
			}
		});
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button>Add Research Asset</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[525px]">
				<DialogHeader>
					<DialogTitle>Add to Research Vault</DialogTitle>
					<DialogDescription>
						Add a document, article, or report to ground your AI generation.
					</DialogDescription>
				</DialogHeader>
				<form action={onSubmit} className="grid gap-4 py-4">
					<input type="hidden" name="userId" value={userId} />

					<div className="grid gap-2">
						<Label htmlFor="sourceUrl">Source URL</Label>
						<Input
							id="sourceUrl"
							name="sourceUrl"
							placeholder="https://example.com/report.pdf"
							required
						/>
					</div>

					<div className="grid gap-2">
						<Label htmlFor="title">Title</Label>
						<Input
							id="title"
							name="title"
							placeholder="e.g. Q3 Earnings Report"
							required
						/>
					</div>

					<div className="grid gap-2">
						<Label htmlFor="assetType">Asset Type</Label>
						<Select name="assetType" defaultValue="WHITEPAPER">
							<SelectTrigger>
								<SelectValue placeholder="Select type" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="WHITEPAPER">Whitepaper</SelectItem>
								<SelectItem value="EARNINGS_REPORT">Earnings Report</SelectItem>
								<SelectItem value="NEWS">News Article</SelectItem>
								<SelectItem value="TECHNICAL_DOC">Technical Documentation</SelectItem>
								<SelectItem value="OTHER">Other</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="grid gap-2">
						<Label htmlFor="description">Description (Optional)</Label>
						<Textarea
							id="description"
							name="description"
							placeholder="Briefly describe what this document contains..."
						/>
					</div>

					<div className="grid gap-2">
						<Label htmlFor="tags">Tags (Comma separated)</Label>
						<Input id="tags" name="tags" placeholder="finance, tech, $TSLA" />
					</div>

					<DialogFooter>
						<Button type="submit" disabled={isPending}>
							{isPending ? "Saving..." : "Save to Vault"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
