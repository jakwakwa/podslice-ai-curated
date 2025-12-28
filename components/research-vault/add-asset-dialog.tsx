"use client";

import { Loader2, UploadCloud } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface AddAssetDialogProps {
	userId: string;
}

export function AddAssetDialog({ userId }: AddAssetDialogProps) {
	const [open, setOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const [activeTab, setActiveTab] = useState("link");
	const [uploading, setUploading] = useState(false);

	// Form states that can be autofilled
	const [sourceUrl, setSourceUrl] = useState("");
	const [title, setTitle] = useState("");

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
				// Reset form
				setSourceUrl("");
				setTitle("");
				setActiveTab("link");
			}
		});
	}

	async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;

		setUploading(true);
		const formData = new FormData();
		formData.append("file", file);

		try {
			const res = await fetch("/api/research-vault/upload", {
				method: "POST",
				body: formData,
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.message || "Upload failed");
			}

			const data = await res.json();
			setSourceUrl(data.url);
			if (!title) {
				setTitle(file.name);
			}
			toast.success("File uploaded successfully");
		} catch (error) {
			console.error(error);
			toast.error(error instanceof Error ? error.message : "Upload failed");
		} finally {
			setUploading(false);
		}
	}

	return (
		<Dialog
			open={open}
			onOpenChange={v => {
				setOpen(v);
				if (!v) {
					setSourceUrl("");
					setTitle("");
				}
			}}>
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

				<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
					<TabsList className="grid w-full grid-cols-2 mb-4">
						<TabsTrigger value="link">Link URL</TabsTrigger>
						<TabsTrigger value="upload">Upload File</TabsTrigger>
					</TabsList>

					<TabsContent value="link">
						<div className="grid gap-2 mb-4">
							<Label htmlFor="url-input">Source URL</Label>
							<Input
								id="url-input"
								placeholder="https://example.com/report.pdf"
								value={sourceUrl}
								onChange={e => setSourceUrl(e.target.value)}
								disabled={activeTab !== "link"} // Visually indicate it comes from upload if on upload tab, though shared state
							/>
						</div>
					</TabsContent>

					<TabsContent value="upload">
						<div className="grid gap-2 mb-4">
							<Label htmlFor="file-upload">Upload PDF or TXT</Label>
							<div className="flex items-center justify-center w-full">
								<label
									htmlFor="file-upload"
									className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600 transition-colors">
									<div className="flex flex-col items-center justify-center pt-5 pb-6">
										{uploading ? (
											<Loader2 className="w-8 h-8 mb-3 text-gray-500 animate-spin" />
										) : (
											<UploadCloud className="w-8 h-8 mb-3 text-gray-500 dark:text-gray-400" />
										)}
										<p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
											<span className="font-semibold">
												{uploading ? "Uploading..." : "Click to upload"}
											</span>
										</p>
										<p className="text-xs text-gray-500 dark:text-gray-400">
											PDF or TXT (MAX. 20MB)
										</p>
									</div>
									<input
										id="file-upload"
										type="file"
										className="hidden"
										accept=".pdf,.txt,application/pdf,text/plain"
										onChange={handleFileUpload}
										disabled={uploading}
									/>
								</label>
							</div>
							{sourceUrl && activeTab === "upload" && (
								<p className="text-xs text-green-600 truncate">Uploaded: {sourceUrl}</p>
							)}
						</div>
					</TabsContent>
				</Tabs>

				<form action={onSubmit} className="grid gap-4">
					<input type="hidden" name="userId" value={userId} />
					{/* Hidden input to ensure sourceUrl is submitted regardless of tab */}
					<input type="hidden" name="sourceUrl" value={sourceUrl} />

					<div className="grid gap-2">
						<Label htmlFor="title">Title</Label>
						<Input
							id="title"
							name="title"
							placeholder="e.g. Q3 Earnings Report"
							value={title}
							onChange={e => setTitle(e.target.value)}
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
						<Button type="submit" disabled={isPending || uploading || !sourceUrl}>
							{isPending ? "Saving..." : "Save to Vault"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
