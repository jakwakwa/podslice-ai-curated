interface SectionHeaderProps {
	title: string;
	description: string;
}

const SectionHeader = ({
	title,
	description,
}: SectionHeaderProps): React.ReactElement => {
	return (
		<div className="max-w-full px-0  text-left mb-0 pb-4 md:pt-4 md:py-0">
			<h4 className="text-xl leading-relaxe text-shadow-[0px_1px_0px_#ededed30] font-semibold tracking-tight mb-3">
				{title}
			</h4>
			<p className=" leading-5 font-normal text-foreground/70 tracking-wide text-xs max-w-[600px] pb-6">
				{description}
			</p>
		</div>
	);
};

export default SectionHeader;
