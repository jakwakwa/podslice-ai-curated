interface SectionHeaderProps {
	title: string;
	description: string;
}

const SectionHeader = ({ title, description }: SectionHeaderProps) => {
	return (
		<div className="max-w-full px-0  text-left mb-0 pb-4 md:pt-4 md:py-0">
			<h4 className="text-lg leading-relaxed text-shadow-[0px_1px_0px_#ededed30] text-primary-foreground-muted font-semibold tracking-tight mb-3">
				{title}
			</h4>
			<p className=" leading-5 font-normal text-indigo-100/80 tracking-wide text-sm max-w-[600px] pb-0 lg:pb-12">
				{description}
			</p>
		</div>
	);
};

export { SectionHeader as default };
