/**
 * Bundles skeleton components
 * Reusable loading skeletons for bundle-related sections
 */

import { Skeleton } from "@/components/ui/skeleton";

export function BundleCardSkeleton() {
	return (
		<div className="bg-[#2f4383]/30 rounded-2xl p-4 animate-pulse">
			<div className="flex flex-col gap-3">
				{/* Image placeholder */}
				<Skeleton className="bg-[#1f2d5f]/50 h-[180px] w-full rounded-lg" />

				{/* Title */}
				<Skeleton className="bg-[#1f2d5f]/50 h-6 w-3/4" />

				{/* Description lines */}
				<div className="flex flex-col gap-2">
					<Skeleton className="bg-[#1f2d5f]/50 h-4 w-full" />
					<Skeleton className="bg-[#1f2d5f]/50 h-4 w-5/6" />
				</div>

				{/* Badge/metadata */}
				<div className="flex gap-2 items-center">
					<Skeleton className="bg-[#1f2d5f]/50 h-5 w-20 rounded-full" />
					<Skeleton className="bg-[#1f2d5f]/50 h-5 w-24 rounded-full" />
				</div>

				{/* Button */}
				<Skeleton className="bg-[#1f2d5f]/50 h-10 w-full rounded-lg mt-2" />
			</div>
		</div>
	);
}

export function BundleGridSkeleton({ count = 6 }: { count?: number }) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
			{Array.from({ length: count }).map((_, i) => (
				<BundleCardSkeleton key={i} />
			))}
		</div>
	);
}

export function BundlesFilterSkeleton() {
	return (
		<div className="mt-4 p-4 md:px-0 mb-6">
			<div className="flex flex-col md:flex-row gap-2 md:items-center border w-full rounded-2xl px-3 py-2 bg-[#2f4383]/20 animate-pulse">
				<Skeleton className="bg-[#1f2d5f]/50 h-12 w-full md:w-[280px]" />
				<Skeleton className="bg-[#1f2d5f]/50 h-12 w-full md:max-w-[260px]" />
				<div className="flex gap-2 md:w-[150px] ml-2">
					<Skeleton className="bg-[#1f2d5f]/50 h-12 w-full" />
				</div>
			</div>
		</div>
	);
}

export function BundlesPageSkeleton() {
	return (
		<div className="w-full">
			<BundlesFilterSkeleton />
			<BundleGridSkeleton />
		</div>
	);
}
