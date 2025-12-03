const StepNr = ({ step }: IStepNr) => {
	return (
		<div className="flex items-center justify-center w-4 h-4 p-4.5 rounded-full mx-0 bg-success text-black/70 font-mono font-semibold text-h5 mb-1 ">
			{step}
		</div>
	);
};

interface IStepNr {
	step: number | string;
}

export default StepNr;
