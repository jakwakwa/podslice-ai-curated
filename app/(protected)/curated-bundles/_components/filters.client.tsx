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
			className=" border-1 border-slate-950/30 shadow-xl md:rounded-2xl mt-4 px-4 py-2 md:px-0 mb-8 sticky">
			<div className="flex flex-col md:flex-row gap-4 md:items-center align-middle w-full rounded-2xl px-3 py-2 justify-start">
				<div className="flex flex-col md:flex-row gap-4">
					<Select value={plan} onValueChange={setPlan}>
						<SelectTrigger
							aria-label={curatedBundlesPageContent.filters.planLabel}
							className="w-full md:w-[280px] h-18">
							<SelectValue
								className="h-18"
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
					<div className="w-full md:max-w-[260px]">
						<Input
							value={query}
							onChange={e => setQuery(e.target.value)}
							placeholder={curatedBundlesPageContent.filters.searchPlaceholder}
							aria-label={curatedBundlesPageContent.filters.searchLabel}
						/>
					</div>
				</div>
				<div className="flex gap-2 md:w-[150px]">
					<Button type="submit" variant="default" size="default" disabled={isPending}>
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
