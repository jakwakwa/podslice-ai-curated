import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function UserInfoPageLevelMsg({
	isActive,
	message,
}: {
	isActive: boolean;
	message: string;
}) {
	if (isActive) {
		return null;
	}
	return (
		<Card className="w-full md:w-full lg:w-2/3 flex flex-col items-center justify-center mx-auto my-12  bg-[#18141eb5] shadow-slate-900/40  shadow-lg  p-8">
			<p className="text-base text-muted-foreground text-center w-full mx-auto min-w-full md:min-w-full  lg:max-w-md p-8  my-4 rounded-3xl">
				{message}
			</p>

			<Link
				href="/manage-membership "
				className=" mt-4 max-w-md   lg:max-w-sm px-8 mx-auto">
				<Button
					variant="default"
					disabled={isActive}
					className=" disabled:text-slate-400 w-full">
					Reactivate
				</Button>
			</Link>
		</Card>
	);
}
