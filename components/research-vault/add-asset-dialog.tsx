"use client";

import { Loader2, UploadCloud, ArrowRight, ArrowLeft } from "lucide-react";
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
import { TogglePill } from "@/components/shared/toggle-pill";

interface AddAssetDialogProps {
	userId: string;
}

export function AddAssetDialog({ userId }: AddAssetDialogProps) {
	const [open, setOpen] = useState(false);
	const [step, setStep] = useState(1);
	const [isPending, startTransition] = useTransition();
	const [activeTab, setActiveTab] = useState("link");
	const [uploading, setUploading] = useState(false);

	// Form states that can be autofilled
	const [sourceUrl, setSourceUrl] = useState("");
	const [title, setTitle] = useState("");
	const [assetType, setAssetType] = useState("WHITEPAPER");
	const [description, setDescription] = useState("");
	const [tags, setTags] = useState("");

	const router = useRouter();

	async function onSubmit() {
		if (!sourceUrl) {
			toast.error("Please provide a source URL or file.");
			return;
		}

		const formData = new FormData();
		formData.append("userId", userId);
		formData.append("sourceUrl", sourceUrl);
		formData.append("title", title);
		formData.append("assetType", assetType);
		formData.append("description", description);
		formData.append("tags", tags);

		startTransition(async () => {
			const result = await saveResearchAsset(formData);

			if (result.error) {
				toast.error(result.error);
			} else {
				toast.success("Asset saved to vault");
				setOpen(false);
				router.refresh();
				// Reset form
				resetForm();
			}
		});
	}

	function resetForm() {
		setStep(1);
		setSourceUrl("");
		setTitle("");
		setActiveTab("link");
		setAssetType("WHITEPAPER");
		setDescription("");
		setTags("");
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

	const handleNext = () => {
		if (step === 1 && sourceUrl) {
			setStep(2);
		}
	};

	const handleBack = () => {
		if (step === 2) {
			setStep(1);
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={v => {
				setOpen(v);
				if (!v) {
					resetForm();
				}
			}}>
			<DialogTrigger asChild>
				<Button>Add Research Asset</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[525px] transition-all duration-200 max-h-[85vh] overflow-y-auto w-[95vw] sm:w-full rounded-xl">
				<DialogHeader>
					<DialogTitle>Add to Research Vault</DialogTitle>
					<DialogDescription>
						{step === 1
							? "Step 1: Add a document, article, or report."
							: "Step 2: Add details to ground your AI generation."}
					</DialogDescription>
				</DialogHeader>

				<div className="mt-4">
					{step === 1 && (
						<div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
							<div className="flex flex-wrap gap-4 mb-4">
								<TogglePill
									isActive={activeTab === "link"}
									onClick={() => setActiveTab("link")}>
									Link URL
								</TogglePill>
								<TogglePill
									isActive={activeTab === "upload"}
									onClick={() => setActiveTab("upload")}>
									Upload File
								</TogglePill>
							</div>

							{activeTab === "link" && (
								<div className="grid gap-2 mb-4">
									<Label htmlFor="url-input">Source URL</Label>
									<Input
										id="url-input"
										placeholder="https://example.com/report.pdf"
										value={sourceUrl}
										onChange={e => setSourceUrl(e.target.value)}
									/>
								</div>
							)}

							{activeTab === "upload" && (
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
										<p className="text-xs text-green-600 truncate">
											Uploaded: {sourceUrl}
										</p>
									)}
								</div>
							)}
						</div>
					)}

					{step === 2 && (
						<div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
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
								<Select name="assetType" value={assetType} onValueChange={setAssetType}>
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
									value={description}
									onChange={e => setDescription(e.target.value)}
								/>
							</div>

							<div className="grid gap-2">
								<Label htmlFor="tags">Tags (Comma separated)</Label>
								<Input
									id="tags"
									name="tags"
									placeholder="finance, tech, $TSLA"
									value={tags}
									onChange={e => setTags(e.target.value)}
								/>
							</div>
						</div>
					)}
				</div>

				<DialogFooter className="mt-4 flex sm:justify-between items-center w-full gap-2">
					{step === 1 ? (
						<div className="w-full flex justify-end">
							<Button
								type="button"
								onClick={handleNext}
								disabled={!sourceUrl || uploading}
								className="gap-2">
								Next <ArrowRight className="h-4 w-4" />
							</Button>
						</div>
					) : (
						<div className="flex w-full justify-between gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={handleBack}
								disabled={isPending}
								className="gap-2">
								<ArrowLeft className="h-4 w-4" /> Back
							</Button>
							<Button
								type="button"
								onClick={onSubmit}
								disabled={isPending || !title}
								className="gap-2">
								{isPending ? (
									<>
										<Loader2 className="h-4 w-4 animate-spin" /> Saving...
									</>
								) : (
									"Save to Vault"
								)}
							</Button>
						</div>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
