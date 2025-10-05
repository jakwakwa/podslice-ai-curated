import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { BundleList } from "./_components/bundle-list";
import { CreateBundleModalWrapper } from "../my-episodes/_components/create-bundle-modal-wrapper";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
	return { title: "My Shared Bundles", description: "Manage your shared episode bundles." };
}

export default async function MyBundlesPage() {
	return (
		<div className="flex episode-card-wrapper mt-4 flex-col justify-center mx-auto w-screen md:w-screen max-w-full">
			<PageHeader
				title="Your Shared Bundles"
				description="Manage and share collections of your episodes."
				button={<CreateBundleModalWrapper />}
			/>

			<BundleList />
		</div>
	);
}
