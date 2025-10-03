import type { UserCurationProfile } from "@/lib/types";
import { SavedCollectionCard } from "./saved-collection-card";

interface SavedUserCurationProfileListProps {
	userCurationProfiles: UserCurationProfile[];
}

export function SavedUserCurationProfileList({ userCurationProfiles }: Readonly<SavedUserCurationProfileListProps>) {
	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{userCurationProfiles?.map(userCurationProfile => (
				<SavedCollectionCard key={userCurationProfile.profile_id} userCurationProfile={userCurationProfile} />
			))}
		</div>
	);
}
