import Link from "next/link";
import { Button } from "@/components/ui/button";

interface FreeTrialPromoProps {
	href: string;
	size?:
		| "lg"
		| "default"
		| "sm"
		| "xs"
		| "md"
		| "icon"
		| "playSmall"
		| "playLarge"
		| null;
	variant?:
		| "default"
		| "destructive"
		| "outline"
		| "secondary"
		| "ghost"
		| "link"
		| "play"
		| null;
	buttonText: string;
}
const FreeTrialPromo = ({ href, size, variant, buttonText }: FreeTrialPromoProps) => {
	return (
		<div className="hidden p-4 my-8  md:px-8 md:my-8 flex-col justify-center items-center ">
			<p className=" my-3 py-2 flex flex-col justify-center items-center text-center text-base leading-normal font-bold text-secondary-foreground  md:text-xl md:text-left md:justify-start md:items-start">
				Claim Your 14 Day Premium Trial
			</p>
			<Link href={href}>
				<Button
					variant={variant}
					size={size}
					className="w-full md:w-fit mx-auto md:mx-0 md:px-4">
					{buttonText}
				</Button>
			</Link>
		</div>
	);
};

export default FreeTrialPromo;
