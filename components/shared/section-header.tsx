interface SectionHeaderProps {
	title: string;
	description: string;
}

const SectionHeader = ({ title, description }: SectionHeaderProps) => {
	return (
		<div className="text-left mb-0 px-6 xl:px-12  py-8 md:pt-8  ">
			<h2 className="text-2xl leading-9 font-semibold tracking-tight mb-4 text-primary-foreground">{title}</h2>
			<p className=" leading-5 font-normal text-secondary-foreground 	 tracking-wide max-w-[600px] pb-6">
				{description}
			</p>
		</div>
	);
};

export { SectionHeader as default };
