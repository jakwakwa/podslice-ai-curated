"use client"

import { AlertCircle, Lock } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { H3, Typography } from "@/components/ui/typography"
import type { Bundle, Podcast } from "@/lib/types"
import { BundleSelectionDialog } from "./bundle-selection-dialog"

type BundleWithAccess = Bundle & {
	podcasts: Podcast[]
	canInteract?: boolean
	lockReason?: string | null
}

type NormalizedBundle = Bundle & {
	podcasts: Podcast[]
	canInteract: boolean
	lockReason: string | null
}

type PlanGateValue = Bundle["min_plan"]

const PLAN_GATE_META = {
	NONE: {
		badgeLabel: "All plans",
		description: "Available on every Podslice plan.",
		statusLabel: "Included in your plan",
	},
	FREE_SLICE: {
		badgeLabel: "Free Slice+",
		description: "Requires Free Slice plan or higher.",
		statusLabel: "Included in Free Slice and above",
	},
	CASUAL_LISTENER: {
		badgeLabel: "Casual Listener+",
		description: "Requires Casual Listener plan or higher.",
		statusLabel: "Included in Casual Listener and Curate Control",
	},
	CURATE_CONTROL: {
		badgeLabel: "Curate Control",
		description: "Requires the Curate Control plan.",
		statusLabel: "Curate Control exclusive",
	},
} satisfies Record<PlanGateValue, { badgeLabel: string; description: string; statusLabel: string }>

const normalizeBundle = (bundle: BundleWithAccess): NormalizedBundle => ({
	...bundle,
	canInteract: bundle.canInteract ?? true,
	lockReason: bundle.lockReason ?? null,
})

interface CuratedBundlesClientProps {
	bundles: BundleWithAccess[]
	error: string | null
}

interface UserCurationProfile {
	profile_id: string
	name: string
	selected_bundle_id?: string
	selectedBundle?: {
		name: string
	}
}

export function CuratedBundlesClient({ bundles, error }: CuratedBundlesClientProps) {
	const router = useRouter()
	const [bundleList, setBundleList] = useState<NormalizedBundle[]>(() => bundles.map(normalizeBundle))
	const [selectedBundle, setSelectedBundle] = useState<NormalizedBundle | null>(null)
	const [isDialogOpen, setIsDialogOpen] = useState(false)
	const [dialogMode, setDialogMode] = useState<"select" | "locked">("select")
	const [isLoading, setIsLoading] = useState(false)
	const [userProfile, setUserProfile] = useState<UserCurationProfile | null>(null)

	// Fetch current user profile on mount
	useEffect(() => {
		const fetchUserProfile = async () => {
			try {
				const response = await fetch("/api/user-curation-profiles")
				if (response.ok) {
					const profile = await response.json()
					setUserProfile(profile)
				}
			} catch (error) {
				console.error("Failed to fetch user profile:", error)
			}
		}

		fetchUserProfile()
	}, [])

	useEffect(() => {
		setBundleList(bundles.map(normalizeBundle))
	}, [bundles])

	useEffect(() => {
		let isMounted = true

		const fetchBundlesWithAccess = async () => {
			try {
				const response = await fetch("/api/curated-bundles")
				if (!response.ok) {
					return
				}

				const data = (await response.json()) as unknown
				if (!Array.isArray(data)) {
					return
				}

				if (isMounted) {
					setBundleList((data as BundleWithAccess[]).map(normalizeBundle))
				}
			} catch (err) {
				console.error("Failed to refresh curated bundles:", err)
			}
		}

		fetchBundlesWithAccess()

		return () => {
			isMounted = false
		}
	}, [])

	const handleBundleClick = (bundle: NormalizedBundle) => {
		setSelectedBundle(bundle)
		setDialogMode(bundle.canInteract ? "select" : "locked")
		setIsDialogOpen(true)
	}

	const handleConfirmSelection = async ({ bundleId, profileName }: { bundleId: string; profileName?: string }) => {
		if (selectedBundle && !selectedBundle.canInteract) {
			setIsDialogOpen(false)
			setSelectedBundle(null)
			setDialogMode("select")
			return
		}

		setIsLoading(true)
		try {
			if (!userProfile) {
				const trimmedProfileName = profileName?.trim()
				if (!trimmedProfileName) {
					throw new Error("PROFILE_NAME_REQUIRED")
				}

				const response = await fetch("/api/user-curation-profiles", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						name: trimmedProfileName,
						isBundleSelection: true,
						selectedBundleId: bundleId,
					}),
				})

				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}))
					throw new Error(errorData.error || "Failed to create curated bundle profile")
				}

				const createdProfile: UserCurationProfile = await response.json()
				setUserProfile(createdProfile)
				toast.success("Curated bundle created successfully!")
				router.push("/dashboard")
				return
			}

			const response = await fetch(`/api/user-curation-profiles/${userProfile.profile_id}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					selected_bundle_id: bundleId,
				}),
			})

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}))
				throw new Error(errorData.error || "Failed to update bundle selection")
			}

			setUserProfile(prev =>
				prev
					? {
						...prev,
						selected_bundle_id: bundleId,
						selectedBundle: {
							name: selectedBundle?.name || "",
						},
					}
					: null
			)

			toast.success("Bundle selection updated successfully!")
			router.push("/dashboard")
		} catch (error) {
			console.error("Failed to update bundle selection:", error)
			const message = error instanceof Error ? error.message : "Failed to update bundle selection"
			if (message !== "PROFILE_NAME_REQUIRED") {
				toast.error(message)
			}
			throw error
		} finally {
			setIsLoading(false)
		}
	}

	const handleCloseDialog = () => {
		setIsDialogOpen(false)
		setSelectedBundle(null)
		setDialogMode("select")
	}

	if (error) {
		return (
			<div className="max-w-2xl mx-auto mt-8 ">
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertTitle>Unable to Load PODSLICE Bundles</AlertTitle>
					<AlertDescription className="mt-2">{error}</AlertDescription>
				</Alert>
				<div className="mt-6 text-center">
					<Button asChild variant="outline">
						<Link href="/curated-bundles">Try Again</Link>
					</Button>
				</div>
			</div>
		)
	}

	if (bundleList.length === 0) {
		return (
			<div className="max-w-2xl mx-auto mt-8 ">
				<Alert>
					<AlertCircle className="h-4 w-4" />
					<AlertTitle>No PODSLICE Bundles Available</AlertTitle>
					<AlertDescription className="mt-2">There are no PODSLICE Bundles available at the moment. Please check back later or contact support if this problem persists.</AlertDescription>
				</Alert>
			</div>
		)
	}

	return (
		<>
			<div className="relative transition-all duration-200 text-card-foreground p-0 px-2 md:px-12 w-full overflow-y-scroll z-1 grid grid-cols-1 sm:grid-cols-1 md:grid-cols-1 xl:grid-cols-2 xl:px-[40px] xl:justify-around items-start  xl:gap-6 md:gap-4 h-fit episode-card-wrapper-dark lg:px-[40px]	 rounded-3xl border-1 border-[#a497cdfc] shadow-lg shadow-[0px_0px_5px_5px_#261c4b5b]  	bg-[#272839ce] backdrop-blur-[3px]  ">
				{bundleList.map(bundle => {
					const planMeta = PLAN_GATE_META[bundle.min_plan]
					const canInteract = bundle.canInteract

					return (
						<Card
							key={bundle.bundle_id}
							className={`flex flex-row sm:flex-col px-5 rounded-4xl shadow-lg bg-[#3f386d7e] border-3 border-[#68739830] w-full transition-shadow duration-200 gap-3 bundle-card-hover xl:max-w-[500px]  xl:overflow-hidden 	 xl:h-[500px] ease-in-out text-shadow-sm shadow-[0_4px_4px_1px_#0506062c] ${canInteract ? "cursor-pointer hover:bg-[#c1bdef17]/50" : "cursor-pointer hover:bg-[#c1bdef17]/20 opacity-75"}`}
							onClick={() => handleBundleClick(bundle)}>
							<CardHeader className="w-full py-4 px-2">
								<div className="w-full flex flex-col-reverse xl:flex-col-reverse gap-6">
									<div className="flex items-start gap-3 text-sm font-normal tracking-wide flex-col w-full md:max-w-[240px]">
										<H3 className="text-[0.8rem] text-[#a7dbe7]/70 font-black font-sans mt-2 text-shadow-sm tracking-tight uppercase leading-tight mb-0 truncate">{bundle.name}</H3>

										<div className="flex flex-wrap items-center gap-2">
											<Badge variant="secondary" className="uppercase tracking-wide text-[0.6rem] font-semibold px-2 py-0.5">
												{planMeta.badgeLabel}
											</Badge>
											{canInteract ? (
												<Badge variant="outline" className="text-emerald-300 border-emerald-500/60 bg-emerald-500/10 text-[0.6rem] font-semibold px-2 py-0.5">
													{planMeta.statusLabel}
												</Badge>
											) : (
												<Badge variant="destructive" className="text-[0.6rem] font-semibold px-2 py-0.5">
													Upgrade required
												</Badge>
											)}
										</div>

										<Badge variant="outline" className="font-normal tracking-wide">
											<Lock size={8} className="mr-2" />
											<Typography className="text-xxs">Fixed Selection</Typography>
										</Badge>
										<Typography className="text-[0.7rem] text-[#f1e9e9b3] font-normal leading-tight mt-0 mb-0 line-clamp-3">Included in bundle:</Typography>
										<CardContent className="bg-[#9798dc35] mx-auto shadow-sm rounded-md w-full m-0 outline-1 outline-[#96a6ba63]">
											<ul className="list-none px-2 m-0 flex flex-col gap-0 py-1">
												{bundle.podcasts.slice(0, 4).map((podcast: Podcast) => (
													<li key={podcast.podcast_id} className=" leading-none flex w-full justify-end gap-0 p-0">
														<div className="w-full flex flex-col gap-0 ">
															<p className="w-full text-[0.7rem] font-semibold leading-normal my-0 px-1 mx-0 text-left text-[#e9f0f1b3] tracking-wide line-clamp-2">
																{podcast.name}
															</p>
														</div>
													</li>
												))}
												{bundle.podcasts.length > 4 ? <span className="text-[0.8rem] text-[#89d3d7b3] font-bold leading-tight mt-0 mb-0 line-clamp-3 pl-1">and more</span> : null}
											</ul>
										</CardContent>
									</div>

									<div className="flex items-start gap-2 text-sm font-normal tracking-wide w-full">
										<div className="relative my-2 rounded-lg outline-4 overflow-hidden w-full min-w-[200px] h-fit lg:h-fit xl:h-fit xl:justify-end">
											{bundle.image_url && <Image className="w-full object-cover" src={bundle.image_url} alt={bundle.name} width={190} height={110} />}
										</div>
									</div>
								</div>
							</CardHeader>
						</Card>
					)
				})}
			</div>

			<BundleSelectionDialog
				isOpen={isDialogOpen}
				onClose={handleCloseDialog}
				onConfirm={handleConfirmSelection}
				mode={dialogMode}
				requiresProfileCreation={!userProfile}
				selectedBundle={selectedBundle}
				currentBundleName={userProfile?.selectedBundle?.name}
				currentBundleId={userProfile?.selected_bundle_id}
				isLoading={isLoading}
				lockReason={selectedBundle?.lockReason}
				requiredPlanLabel={selectedBundle ? PLAN_GATE_META[selectedBundle.min_plan].badgeLabel : undefined}
				requiredPlanDescription={selectedBundle ? PLAN_GATE_META[selectedBundle.min_plan].description : undefined}
			/>
		</>
	)
}
