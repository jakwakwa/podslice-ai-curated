interface SectionHeaderProps {
	title: string;
	description: string;
}

const SectionHeader = ({ title, description }: SectionHeaderProps): React.ReactElement => {
	return (
		<div className="flex items-center justify-between mb-6">
			<h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
			<p className="text-base leading-6 font-normal tracking-[0.025em] text-muted-foreground">{description}</p>
		</div>
	);
};

export default SectionHeader;
