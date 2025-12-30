import type { UserCurationProfile } from "@/lib/types";
import { SavedCollectionCard } from "./saved-feed-card";
import styles from "./saved-user-curation-profile-list.module.css";

interface SavedUserCurationProfileListProps {
	userCurationProfiles: UserCurationProfile[];
}

export function SavedUserCurationProfileList({
	userCurationProfiles,
}: Readonly<SavedUserCurationProfileListProps>) {
	return (
		<div className={styles.gridContainer}>
			{userCurationProfiles?.map(userCurationProfile => (
				<SavedCollectionCard
					key={userCurationProfile.profile_id}
					userCurationProfile={userCurationProfile}
				/>
			))}
		</div>
	);
}
