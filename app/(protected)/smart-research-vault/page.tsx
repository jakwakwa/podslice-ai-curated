import type { JSX } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTrigger,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
import { DetailTaskCard } from "@/src/components/uitripled/detail-task-card-shadcnui";
import { InteractiveLogsTable } from "@/src/components/uitripled/interactive-logs-table-shadcnui";

export default function Page(): JSX.Element {
	return (
		<div className="h-full rounded-none  px-0 mx-0 md:mx-3 flex flex-col lg:rounded-3xl md:rounded-4xl md:mt-0 md:p-8 md:w-full md:gap-y-4">
			<PageHeader title={"Smart Research Vault"} description={""} />

			{/* Hero Section */}

			<Dialog>
				<DialogTrigger>
					<Button variant="default">Upload or Import Research</Button>
				</DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<DialogDescription>
							<DetailTaskCard />
						</DialogDescription>
					</DialogHeader>
				</DialogContent>
			</Dialog>
			<InteractiveLogsTable />
		</div>
	);
}
