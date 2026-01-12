"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { usePlanGatesStore } from "@/lib/stores/plan-gates-store";
import { curatedBundlesPageContent } from "../content";

type PlanOption = {
	value: string;
	label: string;
};

const planOptionsFallback: PlanOption[] = [{ value: "NONE", label: "None" }];

export function CuratedBundlesFilters() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();
	const { options, loaded, load } = usePlanGatesStore();

	const initialQuery = searchParams.get("q") ?? "";
	const initialPlan = searchParams.get("min_plan") ?? "";

	const [query, setQuery] = useState(initialQuery);
	const [plan, setPlan] = useState(initialPlan);

	useEffect(() => {
		load();
	}, [load]);

	useEffect(() => {
		setQuery(initialQuery);
		setPlan(initialPlan);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [initialQuery, initialPlan]);

	const applyFilters = useCallback(
		(nextQuery: string, nextPlan: string) => {
			const params = new URLSearchParams(searchParams.toString());
			if (nextQuery.trim()) params.set("q", nextQuery.trim());
			else params.delete("q");
			if (nextPlan) params.set("min_plan", nextPlan);
			else params.delete("min_plan");

			startTransition(() => {
				router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
			});
		},
		[pathname, router, searchParams]
	);

	const onSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			applyFilters(query, plan);
		},
		[applyFilters, plan, query]
	);

	const onClear = useCallback(() => {
		setQuery("");
		setPlan("");
		startTransition(() => {
			router.replace(pathname);
		});
	}, [pathname, router]);

	const currentOptions = loaded ? (options as PlanOption[]) : planOptionsFallback;
	const selectedLabel = useMemo(
		() =>
			currentOptions.find(p => p.value === plan)?.label ??
			curatedBundlesPageContent.filters.allPlansLabel,
		[plan, currentOptions]
	);

	return (
		<form
			onSubmit={onSubmit}
			className=" border-2 bg-black/20 border-border shadow-lg md:rounded-2xl mt-4 py-2 md:px-0 mb-0 sticky h-fit">
			<div className="flex flex-col md:flex-row gap-4 md:items-center w-full rounded-2xl py-0 justify-star align-middle px-3">
				<div className="flex flex-col md:flex-row gap-4 items-center justify-start w-full">
					<div className="h-13 flex items-start w-full">
						<Select value={plan} onValueChange={setPlan}>
							<SelectTrigger
								aria-label={curatedBundlesPageContent.filters.planLabel}
								className="w-full md:w-[280px] h-13">
								<SelectValue
									className="h-13"
									placeholder={curatedBundlesPageContent.filters.planLabel}>
									{selectedLabel}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{currentOptions.map(option => (
									<SelectItem key={option.value || "ALL"} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="w-full md:max-w-[300px]">
						<Input
							value={query}
							onChange={e => setQuery(e.target.value)}
							placeholder={curatedBundlesPageContent.filters.searchPlaceholder}
							aria-label={curatedBundlesPageContent.filters.searchLabel}
							className="h-13"
						/>
					</div>
				</div>
				<div className="gap-2 h-13 flex flex-row items-center justify-between align-middle my-0 py-2 w-full">
					<Button
						type="submit"
						variant="default"
						size="default"
						disabled={isPending}
						className="h-10 my-4">
						{curatedBundlesPageContent.filters.buttons.search}
					</Button>
					{(initialQuery || initialPlan) && (
						<Button
							type="button"
							variant="outline"
							onClick={onClear}
							disabled={isPending}>
							{curatedBundlesPageContent.filters.buttons.clear}
						</Button>
					)}
				</div>
			</div>
		</form>
	);
}
