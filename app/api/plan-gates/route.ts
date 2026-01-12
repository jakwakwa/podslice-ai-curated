import { PlanGate } from "@prisma/client";
import { NextResponse } from "next/server";

type PlanGateOption = {
	value: keyof typeof PlanGate;
	label: string;
};

function toLabel(v: keyof typeof PlanGate): string {
	switch (v) {
		case "NONE":
			return "Free (All users)";
		case "FREE_SLICE":
			return "Free Slice";
		case "CASUAL_LISTENER":
			return "Tier 2 and 3";
		case "CURATE_CONTROL":
			return "Tier 3 only";
	}
}

export async function GET() {
	const order: (keyof typeof PlanGate)[] = [
		"NONE",
		"FREE_SLICE",
		"CASUAL_LISTENER",
		"CURATE_CONTROL",
	];
	const set = new Set(order);
	const all = Object.keys(PlanGate) as (keyof typeof PlanGate)[];
	const sorted = [...order, ...all.filter(k => !set.has(k))];
	const options: PlanGateOption[] = sorted.map(v => ({ value: v, label: toLabel(v) }));
	return NextResponse.json(options, {
		headers: { "Cache-Control": "public, max-age=300" },
	});
}
