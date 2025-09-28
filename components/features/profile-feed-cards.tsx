import { memo } from "react"
import { Body, Typography } from "@/components/ui/typography"
import type { UserCurationProfileWithRelations } from "@/lib/types"

interface ProfileFeedCardsProps {
	userCurationProfile: UserCurationProfileWithRelations | null
	showProfileCard?: boolean
}

export const ProfileFeedCards = memo(function ProfileFeedCards({ userCurationProfile, showProfileCard = true }: ProfileFeedCardsProps) {
	if (!userCurationProfile) {
		return null
	}

	return (
		<div className="flex flex-col gap-8 p-0 w-full md:w-[100%]">
			<div className="w-full ">
				{/* Profile Card - using default variant */}
				{showProfileCard && (
					<div className="px-4 bg-[#1D181F8C] py-4 rounded-sm ">
						<div className=" flex flex-col items-start justify-between space-y-0 pb-2 rounded-sm">
							<Body className=" text-left font-semibold tracking-tight mt-2 mb-2 uppercase text-sm">Bundle Selection:</Body>
							<Typography as="h4" className="font-sans font-bold text-accent-foreground/70 ">
								{userCurationProfile.selectedBundle?.name || "No Bundle Selected"}
							</Typography>
						</div>
					</div>
				)}
			</div>
		</div>
	)
})
