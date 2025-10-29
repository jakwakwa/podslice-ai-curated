"use client";

import { Copy, Facebook, Mail, MessageCircle } from "lucide-react";
import { useCallback, useState } from "react";
import { RiTwitterXFill } from "react-icons/ri";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface ShareDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	shareUrl: string;
	isPublic: boolean;
}

export function ShareDialog({
	open,
	onOpenChange,
	title,
	shareUrl,
	isPublic,
}: ShareDialogProps) {
	const [copied, setCopied] = useState(false);

	const handleCopy = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(shareUrl);
			setCopied(true);
			toast.success("Link copied", {
				description: isPublic
					? "Anyone with this link can listen"
					: "Link copied to clipboard",
			});
			setTimeout(() => setCopied(false), 2000);
		} catch {
			toast.error("Failed to copy link");
		}
	}, [shareUrl, isPublic]);

	const handleShare = useCallback(
		(platform: string) => {
			const encodedUrl = encodeURIComponent(shareUrl);
			const encodedTitle = encodeURIComponent(title);

			const urls: Record<string, string> = {
				whatsapp: `https://wa.me/?text=${encodedTitle}%0A${encodedUrl}`,
				facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
				twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
				email: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`,
			};

			const url = urls[platform];
			if (url) {
				window.open(url, "_blank", "noopener,noreferrer");
			}
		},
		[shareUrl, title]
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="text-center text-xl font-bold uppercase tracking-wide">
						Share Your Episode
					</DialogTitle>
					<DialogDescription className="sr-only">
						Share this episode on social media or copy the link
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					{/* Social Media Icons */}
					<div className="flex items-center justify-center gap-4">
						<Button
							type="button"
							variant="outline"
							size="icon"
							className="h-14 w-14 rounded-full bg-[#25D366] hover:bg-[#20BD5A] border-0"
							onClick={() => handleShare("whatsapp")}
							aria-label="Share on WhatsApp">
							<MessageCircle className="h-6 w-6 text-white" />
						</Button>

						<Button
							type="button"
							variant="outline"
							size="icon"
							className="h-14 w-14 rounded-full bg-[#1877F2] hover:bg-[#166FE5] border-0"
							onClick={() => handleShare("facebook")}
							aria-label="Share on Facebook">
							<Facebook className="h-6 w-6 text-white" />
						</Button>

						<Button
							type="button"
							variant="outline"
							size="icon"
							className="h-14 w-14 rounded-full bg-gray-900 hover:bg-gray-900 border-0"
							onClick={() => handleShare("twitter")}
							aria-label="Share on X (Twitter)">
							<RiTwitterXFill className="h-6 w-6 text-white" />
						</Button>

						<Button
							type="button"
							variant="outline"
							size="icon"
							className="h-14 w-14 rounded-full bg-slate-300 hover:bg-gray-700 border-0"
							onClick={() => handleShare("email")}
							aria-label="Share via Email">
							<Mail className="h-6 w-6 text-gray-700" />
						</Button>
					</div>

					{/* URL Input with Copy Button */}
					<div className="flex items-center gap-2">
						<Input
							value={shareUrl}
							readOnly
							className="flex-1 bg-secondary/50 border-secondary"
							onClick={e => e.currentTarget.select()}
						/>
						<Button
							type="button"
							variant="default"
							size="sm"
							onClick={handleCopy}
							className="shrink-0">
							{copied ? (
								"Copied!"
							) : (
								<>
									<Copy className="h-4 w-4 mr-1" />
									Copy
								</>
							)}
						</Button>
					</div>

					{!isPublic && (
						<p className="text-sm text-amber-400  text-center">
							⚠️ This episode is private. Set it to public to share with others.
						</p>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
