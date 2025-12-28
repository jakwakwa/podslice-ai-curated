import {
	CheckCircle,
	Minus,
	ShieldAlert,
	Target,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Types matching the FinancialResponse from summary.ts
export interface TradeRecommendation {
	direction: "LONG" | "SHORT" | "HOLD" | "AVOID";
	ticker: string;
	conviction: "HIGH" | "MEDIUM" | "LOW";
	rationale: string;
	timeHorizon?: string;
}

export interface DocumentContradiction {
	claim: string;
	groundTruth: string;
	severity: "CRITICAL" | "NOTABLE" | "MINOR";
}

export interface IntelligentSummaryViewProps {
	intelligence: {
		structuredData: {
			sentimentScore: number;
			sentimentLabel: "BULLISH" | "NEUTRAL" | "BEARISH";
			tickers: string[];
			sectorRotation?: string | null;
		};
		writtenContent: {
			executiveBrief: string;
			variantView?: string | null;
			investmentImplications: string;
			risksAndRedFlags: string;
			tradeRecommendations?: TradeRecommendation[];
			documentContradictions?: DocumentContradiction[];
		};
	};
}

export default function IntelligentSummaryView({
	intelligence,
}: IntelligentSummaryViewProps) {
	// Fallback for null/undefined intelligence
	if (!(intelligence && intelligence.structuredData && intelligence.writtenContent)) {
		return null;
	}

	const { sentimentLabel, sentimentScore, tickers, sectorRotation } =
		intelligence.structuredData;

	const {
		executiveBrief,
		variantView,
		investmentImplications,
		risksAndRedFlags,
		tradeRecommendations,
		documentContradictions,
	} = intelligence.writtenContent;

	const getSentimentIcon = () => {
		switch (sentimentLabel) {
			case "BULLISH":
				return <TrendingUp className="h-5 w-5 text-green-500" />;
			case "BEARISH":
				return <TrendingDown className="h-5 w-5 text-red-500" />;
			default:
				return <Minus className="h-5 w-5 text-yellow-500" />;
		}
	};

	const getSentimentColor = () => {
		switch (sentimentLabel) {
			case "BULLISH":
				return "text-green-500";
			case "BEARISH":
				return "text-red-500";
			default:
				return "text-yellow-500";
		}
	};

	const getConvictionColor = (conviction: string) => {
		switch (conviction) {
			case "HIGH":
				return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
			case "MEDIUM":
				return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800";
			case "LOW":
				return "bg-slate-100 text-slate-800 dark:bg-slate-800/50 dark:text-slate-400 border-slate-200 dark:border-slate-700";
			default:
				return "bg-slate-100 text-slate-800";
		}
	};

	return (
		<div className="space-y-8 animate-in fade-in duration-500">
			{/* Top Row: High-Signal Metrics */}
			<div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between border-b border-border/40 pb-6">
				{/* Sentiment Gauge */}
				<div className="flex items-center gap-4">
					<div className="flex flex-col">
						<span className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1">
							Market Sentiment
						</span>
						<div className="flex items-center gap-3">
							{getSentimentIcon()}
							<span
								className={`text-3xl font-bold tracking-tight ${getSentimentColor()}`}>
								{sentimentLabel}
							</span>
							<Badge variant="outline" className="font-mono text-xs ml-2">
								{sentimentScore?.toFixed(2) ?? "0.00"}
							</Badge>
						</div>
					</div>
				</div>

				{/* Tickers */}
				<div className="flex flex-col items-start md:items-end gap-2 max-w-md">
					<span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
						Key Assets
					</span>
					<div className="flex flex-wrap gap-2 justify-start md:justify-end">
						{tickers?.length > 0 ? (
							tickers.map(ticker => (
								<Badge
									key={ticker}
									variant="secondary"
									className="font-mono text-xs px-2 py-0.5">
									{ticker}
								</Badge>
							))
						) : (
							<span className="text-muted-foreground italic text-xs">
								No specific assets detected
							</span>
						)}
					</div>
				</div>
			</div>

			{/* Executive Brief */}
			<section className="space-y-3">
				<h3 className="text-lg font-semibold flex items-center gap-2">
					<span className="text-primary">📋</span> Executive Brief
				</h3>
				<Card className="border-none shadow-none bg-accent/20">
					<CardContent className="pt-6">
						<div className="prose prose-slate dark:prose-invert max-w-none text-base">
							<ReactMarkdown>{executiveBrief}</ReactMarkdown>
						</div>
					</CardContent>
				</Card>
			</section>

			{/* Main Split Layout */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				{/* Left Column: Investment Implications & Variant View */}
				<div className="space-y-8">
					{/* Investment Implications */}
					<div className="space-y-3">
						<h3 className="text-lg font-semibold flex items-center gap-2 text-indigo-500">
							<span className="text-indigo-500">💡</span> Investment Implications
						</h3>
						<Card className="bg-indigo-50/30 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/50">
							<CardContent className="pt-6">
								<div className="prose prose-sm prose-slate dark:prose-invert max-w-none prose-ul:list-disc prose-li:marker:text-indigo-500">
									<ReactMarkdown className="[&>ul]:space-y-2 [&>ul>li]:pl-0">
										{investmentImplications || "No specific implications extracted."}
									</ReactMarkdown>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Variant View (Contrarian Angle) */}
					{variantView && (
						<div className="space-y-3">
							<h3 className="text-lg font-semibold flex items-center gap-2 text-purple-500">
								<span className="text-purple-500">👁️</span> Variant View
							</h3>
							<Card className="bg-purple-50/30 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/50">
								<CardContent className="pt-6">
									<div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
										<ReactMarkdown>{variantView}</ReactMarkdown>
									</div>
								</CardContent>
							</Card>
						</div>
					)}

					{/* Sector Rotation */}
					{sectorRotation && (
						<div className="flex items-center gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50">
							<TrendingUp className="h-5 w-5 text-blue-500" />
							<div>
								<span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide block">
									Sector Rotation
								</span>
								<p className="text-sm font-medium text-foreground">{sectorRotation}</p>
							</div>
						</div>
					)}
				</div>

				{/* Right Column: Risks & Trades */}
				<div className="space-y-8">
					{/* Risks & Red Flags */}
					<div className="space-y-3">
						<h3 className="text-lg font-semibold flex items-center gap-2 text-red-500">
							<span className="text-red-500">🛡️</span> Risks & Red Flags
						</h3>
						<Card className="bg-red-50/30 dark:bg-red-950/20 border-red-100 dark:border-red-900/50">
							<CardContent className="pt-6">
								<div className="prose prose-sm prose-slate dark:prose-invert max-w-none prose-ul:list-disc prose-li:marker:text-red-500">
									<ReactMarkdown className="[&>ul]:space-y-2">
										{risksAndRedFlags || "No material risks identified."}
									</ReactMarkdown>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Trade Recommendations */}
					{tradeRecommendations && tradeRecommendations.length > 0 && (
						<div className="space-y-3">
							<h3 className="text-lg font-semibold flex items-center gap-2 text-emerald-500">
								<span className="text-emerald-500">🎯</span> Trade Ideas
							</h3>
							<div className="grid grid-cols-1 gap-3">
								{tradeRecommendations.map((trade, idx) => (
									<Card
										key={`${trade.ticker}-${idx}`}
										className="overflow-hidden border-border/50">
										<div className="flex items-stretch">
											<div
												className={cn(
													"w-2",
													trade.direction === "LONG" && "bg-emerald-500",
													trade.direction === "SHORT" && "bg-red-500",
													trade.direction === "HOLD" && "bg-yellow-500",
													trade.direction === "AVOID" && "bg-slate-500"
												)}
											/>
											<div className="flex-1 p-3">
												<div className="flex justify-between items-start mb-2">
													<div className="flex flex-col">
														<span className="font-bold text-lg">{trade.ticker}</span>
														<span
															className={cn(
																"text-[10px] font-bold uppercase tracking-wider",
																trade.direction === "LONG" &&
																	"text-emerald-600 dark:text-emerald-400",
																trade.direction === "SHORT" &&
																	"text-red-600 dark:text-red-400",
																trade.direction === "HOLD" &&
																	"text-yellow-600 dark:text-yellow-400",
																trade.direction === "AVOID" &&
																	"text-slate-600 dark:text-slate-400"
															)}>
															{trade.direction}
														</span>
													</div>
													<Badge
														variant="outline"
														className={cn(
															"border-0 text-[10px] uppercase font-bold px-1.5 py-0.5",
															getConvictionColor(trade.conviction)
														)}>
														{trade.conviction} Conviction
													</Badge>
												</div>
												<p className="text-xs text-muted-foreground leading-snug">
													{trade.rationale}
												</p>
												{trade.timeHorizon && (
													<p className="text-[10px] text-muted-foreground/70 mt-2 font-mono">
														Horizon: {trade.timeHorizon}
													</p>
												)}
											</div>
										</div>
									</Card>
								))}
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Document Contradictions (Full Width) */}
			{documentContradictions && documentContradictions.length > 0 && (
				<div className="pt-4 border-t border-border/40">
					<h3 className="text-lg font-semibold flex items-center gap-2 text-orange-500 mb-4">
						<ShieldAlert className="h-5 w-5" /> Document Verification
					</h3>
					<div className="grid gap-4">
						{documentContradictions.map((item, idx) => (
							<Card
								key={idx}
								className="bg-orange-50/10 dark:bg-orange-950/10 border-orange-200/50 dark:border-orange-900/50">
								<CardHeader className="pb-2">
									<div className="flex items-center justify-between">
										<Badge
											variant="outline"
											className={cn(
												"border-orange-200 text-orange-700 dark:text-orange-400",
												item.severity === "CRITICAL" &&
													"bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400",
												item.severity === "NOTABLE" &&
													"bg-orange-100 text-orange-800 dark:bg-orange-900/30"
											)}>
											{item.severity} discrepancy
										</Badge>
									</div>
								</CardHeader>
								<CardContent className="space-y-3">
									<div className="grid md:grid-cols-2 gap-4 text-sm">
										<div className="bg-background/50 p-3 rounded-lg border border-border/50">
											<span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1 mb-1">
												<Target className="h-3 w-3" /> Speaker Claimed
											</span>
											<p className="text-foreground/90 leading-relaxed">"{item.claim}"</p>
										</div>
										<div className="bg-background/50 p-3 rounded-lg border border-border/50">
											<span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1 mb-1">
												<CheckCircle className="h-3 w-3 text-green-500" /> Ground Truth
											</span>
											<p className="text-foreground/90 leading-relaxed">
												"{item.groundTruth}"
											</p>
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
