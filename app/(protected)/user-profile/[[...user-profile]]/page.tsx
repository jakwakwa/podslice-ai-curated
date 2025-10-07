import { UserProfile } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Account Management",
	description: "Manage your profile and security settings.",
};

export default function UserProfilePage(): JSX.Element {
	return <UserProfile />;
}
