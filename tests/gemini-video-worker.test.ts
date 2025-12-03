import { describe, expect, it } from "vitest";
import {
	evaluateSegmentQuality,
	sanitizeSegmentText,
	type TranscribedSegment,
} from "../lib/inngest/providers/gemini-video-worker";

describe("sanitizeSegmentText", () => {
	it("removes timestamps, speaker labels, and extra whitespace", () => {
		const input = "HOST: [00:01:23] Hello there.\n(00:02:34) This is 00:03 more text.";
		const sanitized = sanitizeSegmentText(input);
		expect(sanitized).toBe("Hello there. This is more text.");
	});

	it("returns trimmed plain text when input already clean", () => {
		const input = "This transcript is already clean.";
		const sanitized = sanitizeSegmentText(input);
		expect(sanitized).toBe("This transcript is already clean.");
	});
});

describe("evaluateSegmentQuality", () => {
	const makeSegment = (
		text: string,
		overrides?: Partial<TranscribedSegment>
	): TranscribedSegment => ({
		index: overrides?.index ?? 1,
		text,
		startOffset: overrides?.startOffset ?? "0s",
		endOffset: overrides?.endOffset ?? "10s",
	});

	it("accepts a sufficiently detailed segment", () => {
		const result = evaluateSegmentQuality(
			makeSegment(
				"This segment contains enough meaningful, descriptive words to pass validation."
			)
		);
		expect(result).toEqual({ valid: true });
	});

	it("rejects segments that are too short", () => {
		const result = evaluateSegmentQuality(makeSegment("Too short."));
		expect(result).toEqual({ valid: false, reason: "too_short" });
	});

	it("rejects segments dominated by stop words", () => {
		const result = evaluateSegmentQuality(
			makeSegment("and the and the and the and the and the")
		);
		expect(result).toEqual({ valid: false, reason: "stopword_ratio" });
	});

	it("rejects segments with insufficient non-stopword content", () => {
		const result = evaluateSegmentQuality(makeSegment("and and and and and insight"));
		expect(result).toEqual({ valid: false, reason: "insufficient_content" });
	});

	it("rejects empty text when timestamps are present", () => {
		const result = evaluateSegmentQuality(
			makeSegment("   ", { startOffset: "0s", endOffset: "5s" })
		);
		expect(result).toEqual({ valid: false, reason: "empty_text_with_timestamp" });
	});
});
