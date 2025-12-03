import Image from "next/image";
import type { PlanTier } from "@/lib/types";

interface Props {
	tier: PlanTier;
}

export function PriceTitle({ tier }: Props) {
	const { productTitle, icon, featured } = tier;
	return (
		<div className="flex justify-between items-center px-8 pt-8">
			<div className={"flex items-center gap-[10px]"}>
				<Image src={icon} height={40} width={40} alt={productTitle} />
				<p className={"text-[20px] leading-[30px] font-semibold"}>{productTitle}</p>
			</div>
			{featured && (
				<div
					className={
						"flex items-center px-3 py-1 rounded-xs border border-secondary-foreground/10 text-[14px] h-[29px] leading-[21px] featured-card-badge"
					}>
					Most popular
				</div>
			)}
		</div>
	);
}
