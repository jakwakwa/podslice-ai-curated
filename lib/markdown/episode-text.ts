// Centralized helpers for episode/user episode markdown & takeaway extraction.
// Keeps rendering consistent between detail pages and the audio player sheet.

export function extractKeyTakeaways(markdown?: string | null, max: number = 5): string[] {
	if (!markdown) return [];
	const lines = markdown.split(/\r?\n/);
	const bullets: string[] = [];
	for (const raw of lines) {
		if (bullets.length >= max) break;
		const trimmed = raw.trim();
		if (!trimmed) continue;
		let item: string | null = null;
		if (trimmed.startsWith("-") || trimmed.startsWith("*") || /^\d+\./.test(trimmed)) {
			item = trimmed.replace(/^(-|\*|\d+\.)\s*/, "");
		} else {
			const boldMatch = trimmed.match(/^\*\*(.+?)\*\*:?\s*(.*)$/);
			if (boldMatch) {
				const title = boldMatch[1]!.trim();
				const rest = (boldMatch[2] || "").trim();
				item = rest ? `${title}: ${rest}` : title;
			}
		}
		if (item) {
			const clean = item.replace(/\*/g, "").trim();
			if (clean) bullets.push(clean);
		}
	}
	return bullets;
}

export function normalizeSummaryMarkdown(input: string | null | undefined): string {
	if (!input) return "";
	const lines = input.split(/\r?\n/).map(line => {
		let trimmed = line.trim();
		if (/^\*+\s*Key\s+(Highlights|Takeaways):?\*+\s*$/i.test(trimmed)) {
			return `### Key ${trimmed.match(/Highlights/i) ? "Highlights" : "Takeaways"}`;
		}
		if (/^Key\s+Highlights:?$/i.test(trimmed)) return "### Key Highlights";
		if (/^Key\s+Takeaways:?$/i.test(trimmed)) return "### Key Takeaways";
		if (/^Here'?s a summary of the content:?\s*$/i.test(trimmed)) return "### Summary";
		if (trimmed.startsWith("*") && !trimmed.startsWith("* ")) {
			trimmed = trimmed.replace(/^\*/, "* ");
		}
		if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
			return trimmed.replace(/\*/g, "");
		}
		if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
			const core = trimmed.slice(2, -2);
			if (!core.includes("*")) return core;
		}
		if ((trimmed.match(/\*\*/g) || []).length % 2 === 1 && trimmed.endsWith("**")) {
			return trimmed.slice(0, -2).trimEnd();
		}
		return trimmed;
	});
	return lines
		.join("\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

function isListLikeLine(line: string): boolean {
	if (!line) return false;
	if (line.startsWith("-") || line.startsWith("*")) return true;
	if (/^\d+\./.test(line)) return true;
	return /^\*\*(.+?)\*\*:?\s+.+/.test(line);
}

export function extractNarrativeRecap(markdown?: string | null): string {
	if (!markdown) return "";
	const normalized = normalizeSummaryMarkdown(markdown);
	if (!normalized) return "";
	const lines = normalized.split(/\r?\n/);
	const summaryHeadingIndex = lines.findIndex(line =>
		/^#{1,6}\s+Summary$/i.test(line.trim())
	);
	const firstListIndex = lines.findIndex(line => isListLikeLine(line.trim()));
	let startIndex = summaryHeadingIndex >= 0 ? summaryHeadingIndex + 1 : -1;
	if (startIndex === -1 && firstListIndex >= 0) {
		let lastListIndex = firstListIndex;
		for (let i = firstListIndex + 1; i < lines.length; i++) {
			const trimmed = lines[i]?.trim() ?? "";
			if (!trimmed) continue;
			if (isListLikeLine(trimmed)) {
				lastListIndex = i;
				continue;
			}
			if (/^#{1,6}\s+/.test(trimmed)) {
				startIndex = i + 1;
				break;
			}
			startIndex = i;
			break;
		}
		if (startIndex === -1) {
			startIndex = lastListIndex + 1;
		}
	}
	if (startIndex === -1) {
		startIndex = 0;
	}
	while (startIndex < lines.length && !lines[startIndex]!.trim()) {
		startIndex += 1;
	}
	const recapCandidates = lines.slice(startIndex);
	const recapLines: string[] = [];
	for (const raw of recapCandidates) {
		const trimmed = raw.trim();
		if (!trimmed) {
			if (recapLines.length > 0 && recapLines[recapLines.length - 1] !== "") {
				recapLines.push("");
			}
			continue;
		}
		if (/^#{1,6}\s+/.test(trimmed)) {
			break;
		}
		if (isListLikeLine(trimmed)) {
			continue;
		}
		if (/^Summary:?$/i.test(trimmed.replace(/\*/g, ""))) {
			continue;
		}
		recapLines.push(trimmed);
	}
	while (recapLines.length > 0 && recapLines[recapLines.length - 1] === "") {
		recapLines.pop();
	}
	while (recapLines.length > 0 && recapLines[0] === "") {
		recapLines.shift();
	}
	if (recapLines.length === 0) {
		const fallback = lines
			.filter(line => {
				const trimmed = line.trim();
				if (!trimmed) return false;
				if (/^#{1,6}\s+/.test(trimmed)) return false;
				if (isListLikeLine(trimmed)) return false;
				if (/^Here'?s a summary of the content:?$/i.test(trimmed)) return false;
				return true;
			})
			.join("\n")
			.replace(/\n{3,}/g, "\n\n")
			.trim();
		return fallback;
	}
	return recapLines.join("\n");
}
