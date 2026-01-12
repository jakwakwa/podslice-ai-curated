import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { vaultPageContent } from "@/app/(protected)/smart-research-vault/content";
import { AddAssetDialog } from "@/components/research-vault/add-asset-dialog";
import { AssetList } from "@/components/research-vault/asset-list";
import SharedSection from "@/components/shared/section-common";
import { PageHeader } from "@/components/ui/page-header";

export default async function Page() {
	const user = await currentUser();

	if (!user) {
		redirect("/sign-in");
	}

	const { header } = vaultPageContent;

	return (
		<div className="flex flex-col gap-4 p-4 md:p-8">
			<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
				<PageHeader title={header.title} description={""} />
				<div className="w-full md:w-auto">
					<AddAssetDialog userId={user.id} />
				</div>
			</div>

			<SharedSection title="Your Assets" description={header.description}>
				<div className="px-4 pb-8 md:px-6">
					<AssetList userId={user.id} />
				</div>
			</SharedSection>
		</div>
	);
}
