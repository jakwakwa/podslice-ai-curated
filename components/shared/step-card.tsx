import { Card } from "../ui/card";
import StepNr from "./step-nr";

const StepCard = ({ step, title, description }: StepCardProps) => {
	return (
		<Card className=" h-full min-h-64 duration-200 ease-in-out relative rounded-3xl p-2 max-h-74 gap-2">
			<div className="flex flex-col p-3.5	h-fit items-center justify-center w-full gap-3">
				<StepNr step={step} />
				<h3 className="text-xl text-center font-bold tracking-tight mb-2 mt-0 w-full text-secondary-foreground">
					{title}
				</h3>
				<p className="text-link/90 text-center font-medium text-xs mb-4">{description}</p>
			</div>
		</Card>
	);
};

interface StepCardProps {
	step: number;
	title: string;
	description: string;
}

export default StepCard;
