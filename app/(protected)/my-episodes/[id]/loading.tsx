export default function Loading() {
	return (
		<div className="w-full max-w-5xl min-h-screen mx-auto mt-12 space-y-4">
			<div className="h-8 w-2/3 bg-[#1b181f] rounded animate-pulse" />
			<div className="h-4 w-1/3 bg-[#1b181f] rounded animate-pulse" />
			<div className="h-40 w-full bg-[#1b181f] rounded animate-pulse" />
		</div>
	);
}
