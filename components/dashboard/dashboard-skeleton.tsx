/**
 * Dashboard skeleton components
 * Reusable loading skeletons for dashboard sections
 */

export function SummarySkeleton() {
	return (
		<div className="w-full pt-0 pr-4 mt-0 md:mr-3 flex flex-col lg:flex-col md:p-8 sm:pt-0 md:pt-9 md:mt-0 md:max-w-[280px]  overflow-hidden">
			<div className="w-full flex flex-col justify-between p-0 rounded-2xl">
				<div className="w-[90%] mx-4 mt-8 md:w-48 pt-8 md:pt-0 md:px-0 md:pb-3 md:h-6  animate-pulse rounded" />
				<div className="w-2/3 mx-4 h-12 mt-2 md:hidden md:pb-3 md:h-6 animate-pulse rounded" />
				<div className="w-1/3 mx-4 h-12 mt-2 md:hidden md:pb-3 md:h-6 animate-pulse rounded" />
				<div className="w-1/3 mx-4 h-12 md:hidden md:pb-3 md:h-6 animate-pulse rounded" />
				<div className=" border-b-0 border-0  mx-auto px-5 w-full h-fit rounded-t-lg overflow-hidden">
					<div className="h-8 w-24 ml-0  animate-pulse rounded my-2" />
					<div className="mb-4 flex flex-col">
						<div className="h-4 w-32  animate-pulse rounded mb-2" />
						<div className="flex w-full px-2 md:px-2 py-1 rounded md:border-1 gap-3">
							<div className="h-6 w-full md:animate-pulse rounded" />
						</div>
					</div>
				</div>
			</div>
			<div className="mt-0 w-full overflow-hidden shadow-md">
				<div className="md:bg-[#2F438335]/30 border-t-0 overflow-hidden rounded-b-2xl border-1 px-4 p-4">
					<div className="h-4 w-20 md:bg-[#2F438335]/30 animate-pulse rounded mb-2" />
					<div className="flex flex-col justify-start gap-2 items-start my-2 px-0 w-full md:border-1 md:border-gray-800 rounded-md overflow-hidden pt-0">
						<div className="flex flex-row justify-between gap-1 items-center h-9 w-full md:bg-black/10 py-3 px-2">
							<div className="h-4 w-32 md:bg-[#2F438335]/30 animate-pulse rounded" />
							<div className="h-4 w-8 md:bg-[#2F438335]/30 animate-pulse rounded" />
						</div>
						<div className="flex flex-row justify-between gap-2 items-center h-5 w-full py-3 px-2">
							<div className="h-4 w-16 md:bg-[#2F438335]/30 animate-pulse rounded" />
							<div className="h-4 w-24 md:bg-[#2F438335]/30 animate-pulse rounded" />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export function LatestEpisodeSkeleton() {
	return (
		<div className="w-full border-b-0 hidden rounded-0 py-0 my-0 mx-0 mt-0 pt-6 px-4 sm:pt-0 md:pt-9 md:mt-0 md:mb-8 md:px-6 border-dark md:rounded-3xl overflow-hidden">
			<div className="h-7 w-64  animate-pulse rounded mb-4" />
			<div className="h-5 w-full  animate-pulse rounded mb-6" />
			<div className="px-0">
				<div className=" h-[130px] w-full animate-pulse rounded-lg" />
			</div>
		</div>
	);
}

export function RecentListSkeleton() {
	return (
		<div className="p-2 md:px-2 rounded-xl flex flex-col w-full min-w-full overflow-hidden gap-2 lg:px-2">
			<div className="h-[130px] w-full animate-pulse rounded-lg" />
			<div className="h-[130px] w-full animate-pulse rounded-lg" />
			<div className="h-[130px] w-full animate-pulse rounded-lg" />
		</div>
	);
}

export function BundleFeedSkeleton() {
	return (
		<div className="w-full flex flex-col gap-0 justify-center items-baseline shadow-md shadow-stone-950/20 mt-0 md:mt-4 md:m-0 xl:flex-row md:gap-4 pt-0 md:mb-0 border-1 md:rounded-3xl overflow-hidden">
			<div className="w-full pt-0 mt-0 flex flex-col lg:flex-row">
				<SummarySkeleton />
				<LatestEpisodeSkeleton />
			</div>
		</div>
	);
}

