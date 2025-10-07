import { auth } from "@clerk/nextjs/server";

import type { Metadata } from "next";
import { UserInfoPageLevelMsg } from "@/components/shared/info-messages.tsx/userinfo-pagelevel-msg";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/prisma";
import { userIsActive } from "@/lib/usage";
import { CreateBundleModalWrapper } from "../my-episodes/_components/create-bundle-modal-wrapper";
import { BundleList } from "./_components/bundle-list";
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
	return { title: "My Shared Bundles", description: "Manage your shared episode bundles." };
}

export default async function MyBundlesPage() {
	const { userId } = await auth();
	let isActive = false;
	if (userId) {
		isActive = await userIsActive(prisma, userId);
	}
	return (
		<div className="flex episode-card-wrapper mt-4 flex-col justify-center mx-auto w-screen md:w-screen max-w-full">
			<PageHeader
				title="Manage Shared Bundles"
				description={isActive ? "Manage and share collections of your episodes." : "Your membership is inactive. You can't create or share bundles until you reactivate your plan."}
				button={
					<div className={!isActive ? "p-4" : ""}>
						<CreateBundleModalWrapper isActive={isActive} />
					</div>
				}
			/>

			{isActive ? <BundleList /> : <UserInfoPageLevelMsg isActive={isActive} message="Your membership is inactive. You can't create or share bundles until you reactivate your plan." />}
		</div>
	);
}
