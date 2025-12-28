import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export interface FinancialIntelligence {
	sentimentScore: number;
	sentimentLabel: "BULLISH" | "NEUTRAL" | "BEARISH";
	tickers: string[];
	executiveBrief: string;
	investmentImplications: string;
}

interface IntelligentSummaryViewProps {
	intelligence: FinancialIntelligence;
}

export default function IntelligentSummaryView({
	intelligence,
}: IntelligentSummaryViewProps) {
	const {
		sentimentLabel,
		sentimentScore,
		tickers,
		executiveBrief,
		investmentImplications,
	} = intelligence;

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
								{sentimentScore.toFixed(2)}
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

			{/* Main Split Layout */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				{/* Left Column: Executive Brief (2/3) */}
				<div className="lg:col-span-2 space-y-4">
					<h3 className="text-lg font-semibold flex items-center gap-2">
						<span className="text-primary">📋</span> Executive Brief
					</h3>
					<Card className="border-none shadow-none bg-transparent p-0">
						<CardContent className="p-0">
							<div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-medium prose-p:leading-relaxed prose-li:marker:text-primary/50 text-base">
								<ReactMarkdown>{executiveBrief}</ReactMarkdown>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Right Column: Implications (1/3) */}
				<div className="lg:col-span-1 space-y-4">
					<h3 className="text-lg font-semibold flex items-center gap-2 text-indigo-500">
						<span className="text-indigo-500">💡</span> Investment Implications
					</h3>
					<Card className="bg-indigo-50/30 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/50">
						<CardContent className="pt-6">
							<div className="prose prose-sm prose-slate dark:prose-invert max-w-none prose-ul:list-disc prose-li:marker:text-indigo-500">
								<ReactMarkdown>{investmentImplications}</ReactMarkdown>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
