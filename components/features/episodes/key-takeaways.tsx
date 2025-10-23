import type { ReactElement } from "react";

export default function KeyTakeaways({
	items,
}: {
	items: string[];
}): ReactElement | null {
	if (!items || items.length === 0) return null;
	// my-episodes trims the first bullet (title) when present upstream; keep that convention flexible
	const list = items.length > 0 ? items.slice(1) : items;
	if (list.length === 0) return null;
	return (
		<div className="mt-4 episode-card-wrapper px-4 py-4 rounded-lg">
			<h3 className="md:text-lg font-semibold mx-2  md:mx-8 my-4 text-secondary-foreground pb-2">
				Key Episode Takeaways
			</h3>
			<ul className=" list-disc space-y-1 text-primary-foreground pr-0  mx-6 md:mx-12">
				{list.map((t, i) => (
					<li className="my-4 font-medium text-sm md:text-base" key={i}>
						{t}
					</li>
				))}
			</ul>
		</div>
	);
}
