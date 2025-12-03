import { AppSpinner } from "@/components/ui/app-spinner";

export default function Loading() {
	return (
		<div className="container mx-auto p-6 max-w-6xl">
			<AppSpinner size="lg" label="Loading bundles…" />
		</div>
	);
}
