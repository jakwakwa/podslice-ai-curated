"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { UserCurationProfile } from "@/lib/types";

export function SavedCollectionCard({
	userCurationProfile,
}: {
	userCurationProfile: UserCurationProfile;
}) {
	const formatDate = (date: Date | null | undefined) => {
		if (!date) return "N/A";
		return new Date(date).toLocaleString();
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>{userCurationProfile.name}</CardTitle>
				<CardDescription>
					Created on {formatDate(userCurationProfile.created_at)}
				</CardDescription>
			</CardHeader>
			<CardFooter>
				<Link href={`/dashboard`} className="w-full">
					<Button variant="outline" className="w-full">
						View Feed
					</Button>
				</Link>
			</CardFooter>
		</Card>
	);
}
