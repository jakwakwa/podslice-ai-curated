import { UserProfile } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Account Management",
	description: "Manage your profile and security settings.",
};

export default function UserProfilePage() {
	return (
		<div className="flex flex-col content-center items-center justify-start w-full min-h-screen h-fit relative z-1  mx-auto">
			<UserProfile />
		</div>
	);
}
