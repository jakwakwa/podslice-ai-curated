import {
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Select as ShadCnSelect,
} from "@/components/ui/select";

interface Props {
	value: string;
	options: string[];
	onChange: (value: string) => void;
}
export function Select({ onChange, options, value }: Props) {
	return (
		<ShadCnSelect onValueChange={onChange} value={value}>
			<SelectTrigger className="w-full">
				<SelectValue defaultValue={value} />
			</SelectTrigger>
			<SelectContent>
				{options.map(option => (
					<SelectItem key={option} value={option}>
						{option}
					</SelectItem>
				))}
			</SelectContent>
		</ShadCnSelect>
	);
}
