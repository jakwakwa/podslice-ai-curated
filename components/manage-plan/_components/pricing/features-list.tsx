import { CircleCheck } from "lucide-react"
import type { PlanTier } from "@/lib/types"

interface Props {
	tier: PlanTier
}

export function FeaturesList({ tier }: Props) {
	return (
		<ul className={"p-8 flex flex-col gap-4"}>
			{tier.features.map((feature: string) => (
				<li key={feature} className="flex gap-x-3">
					<CircleCheck className={"h-6 w-6 text-muted-foreground"} />
					<span className={"text-base"}>{feature}</span>
				</li>
			))}
		</ul>
	)
}
