"use client";

import { ArrowRight, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { UserCurationProfileWithRelations } from "@/lib/types";
import { SavedCollectionCard } from "./saved-feed-card";

interface UserFeedProps {
	userCurationProfiles: UserCurationProfileWithRelations[];
}

export function UserFeed({ userCurationProfiles }: UserFeedProps) {
	// Filter for active profiles only
	const activeProfiles = userCurationProfiles.filter(profile => profile.is_active);

	if (activeProfiles.length === 0) {
		return (
			<Card className="w-full">
				<CardHeader className="text-center">
					<div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
						<Sparkles className="w-8 h-8 text-primary" />
					</div>
					<CardTitle className="text-2xl">Welcome to PODSLICE!</CardTitle>
					<CardDescription className="text-lg">
						Create your first Personalized Feed to start generating personalized podcasts
					</CardDescription>
				</CardHeader>
				<CardContent className="text-center space-y-4">
					<p className="text-muted-foreground max-w-screen md:max-w-md mx-auto">
						Choose from our PODSLICE Bundles or create a custom profile with your favorite
						podcasts. Our AI will generate weekly episodes based on your selections.
					</p>
					<div className="flex flex-col sm:flex-row gap-3 justify-center">
						<Link href="/build">
							<Button className="w-full sm:w-auto" variant="default">
								<Plus className="w-4 h-4 mr-2" />
								Create Your First Profile
								<ArrowRight className="w-4 h-4 ml-2" />
							</Button>
						</Link>
						<Link href="/curated-bundles">
							<Button variant="default" className="w-full sm:w-auto">
								Browse PODSLICE Bundles
							</Button>
						</Link>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-2xl font-bold">Your Personalized Feed</h2>
				{/* Only show "Create New Profile" if user doesn't have an active profile */}
				{activeProfiles.length === 0 && (
					<Link href="/build">
						<Button size="sm" variant="default">
							<Plus className="w-4 h-4 mr-2" />
							Create New Profile
						</Button>
					</Link>
				)}
			</div>
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{activeProfiles.map(profile => (
					<SavedCollectionCard key={profile.profile_id} userCurationProfile={profile} />
				))}
			</div>
		</div>
	);
}
