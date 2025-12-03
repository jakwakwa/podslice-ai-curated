import { AppSpinner } from "@/components/ui/app-spinner";

export default function Loading() {
	return (
		<div className="w-screen mx-auto p-6">
			<AppSpinner variant={"dots"} size="lg" label="Loading episodes…" />
		</div>
	);
}
