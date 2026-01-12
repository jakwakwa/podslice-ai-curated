"use client";

import {
	AlertTriangle,
	ArrowRight,
	BarChart3,
	Briefcase,
	Lightbulb,
	Play,
	Target,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import {
	Cell,
	Line,
	LineChart,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAudioPlayerStore } from "@/store/audioPlayerStore";

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
	title: string;
	audioUrl?: string | null;
	duration?: number | null; // in seconds
	publishedAt?: Date;
	youtubeUrl?: string;
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
	customAudioPlayer?: React.ReactNode;
	hideHeader?: boolean;
	documentContradictions?: DocumentContradiction[];
	chartData?: { day: string; value: number }[];
}

// Mock data for asset performance line chart
const MOCK_CHART_DATA = [
	{ day: "1D", value: 2350 },
	{ day: "2D", value: 2400 },
	{ day: "3D", value: 2380 },
	{ day: "4D", value: 2420 },
	{ day: "5D", value: 2450 },
	{ day: "6D", value: 2410 },
	{ day: "7D", value: 2390 },
	{ day: "8D", value: 2460 },
	{ day: "1W", value: 2480 },
	{ day: "1.5W", value: 2500 },
	{ day: "2W", value: 2520 },
	{ day: "1M", value: 2490 },
];

export default function IntelligentSummaryView({
	title,
	audioUrl,
	duration,
	publishedAt,
	youtubeUrl,
	intelligence,
	customAudioPlayer,
	hideHeader,
	documentContradictions,
	chartData,
}: IntelligentSummaryViewProps) {
	const { setEpisode } = useAudioPlayerStore();

	// Fallback for null/undefined intelligence
	if (!(intelligence?.structuredData && intelligence?.writtenContent)) {
		return null;
	}

	const { sentimentLabel, sentimentScore, tickers } = intelligence.structuredData;

	const {
		executiveBrief,
		investmentImplications,
		risksAndRedFlags,
		tradeRecommendations,
	} = intelligence.writtenContent;

	// Normalize sentiment score to percentage (0-100)
	// Assuming score is -1.0 to 1.0. Map -1 -> 0, 1 -> 100.
	const sentimentPercentage = Math.round(((sentimentScore + 1) / 2) * 100);
	const sentimentData = [
		{ name: "score", value: sentimentPercentage },
		{ name: "remaining", value: 100 - sentimentPercentage },
	];

	// Date formatter
	const formatDate = (date?: Date) => {
		if (!date) return "";
		return new Intl.DateTimeFormat("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		}).format(new Date(date));
	};

	// const formatDuration = (seconds?: number | null) => {
	// 	if (!seconds) return "0:00";
	// 	const mins = Math.floor(seconds / 60);
	// 	const secs = Math.floor(seconds % 60);
	// 	return `${mins}:${secs.toString().padStart(2, "0")}`;
	// };

	const getSentimentColor = (label: string) => {
		switch (label) {
			case "BULLISH":
				return "#4ade80"; // green-400
			case "BEARISH":
				return "#ef4444"; // red-500
			default:
				return "#eab308"; // yellow-500
		}
	};

	const sentimentColor = getSentimentColor(sentimentLabel);

	// Get latest price from chart data
	const latestPrice =
		chartData && chartData.length > 0 ? chartData[chartData.length - 1]?.value : null;

	return (
		<div className="flex flex-col gap-6 animate-in fade-in duration-500 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-[#0a0a0a] text-white rounded-3xl font-sans">
			{/* Header */}
			{hideHeader && (
				<div className="space-y-1">
					<div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
						{duration && <span>{Math.round(duration / 60)} min</span>}
						{publishedAt && (
							<>
								<span>•</span>
								<span>{formatDate(publishedAt)}</span>
							</>
						)}
						{youtubeUrl && (
							<>
								<span>•</span>
								<a
									href={youtubeUrl}
									target="_blank"
									rel="noreferrer"
									className="hover:text-white transition-colors">
									Youtube Url
								</a>
							</>
						)}
					</div>
				</div>
			)}

			{/* Top Row: Audio Spec + Sentiment */}
			<div className="flex flex-col-reverse md:grid md:grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Executive Brief */}
				<Card className="bg-[#111] lg:col-span-2 border border-white/5 rounded-3xl overflow-hidden hover:border-white/10 transition-colors">
					<CardHeader className="flex flex-row items-center gap-3 pb-2 pt-6 px-6">
						<div className="p-2 bg-gray-800/50 rounded-lg">
							<Briefcase className="h-5 w-5 text-gray-400" />
						</div>
						<CardTitle className="text-lg font-bold text-gray-100">
							Executive Brief
						</CardTitle>
					</CardHeader>
					<CardContent className="px-6 pb-6">
						<div className="prose prose-invert prose-sm max-w-none text-gray-400 leading-relaxed">
							<ReactMarkdown>{executiveBrief}</ReactMarkdown>
						</div>
					</CardContent>
				</Card>
				{/* Audio Player Card */}

				<Card
					data-audio-url={audioUrl}
					className="lg:col-span-1 h-full max-h-[100px] md:max-h-[400px] bg-[#111] border-none shadow-2xl rounded-3xl overflow-hidden relative group">
					<CardContent className="p-6 md:p-8 flex flex-col justify-between h-full relative z-10 max-h-[90px] md:max-h-[400px]">
						{customAudioPlayer ? (
							<div className="flex flex-col h-full justify-center">
								{customAudioPlayer}
							</div>
						) : (
							<>
								{/* Simulated Waveform Visualization */}
								<div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
									<div className="flex items-center gap-1 h-32 w-full px-8 justify-center">
										{Array.from({ length: 40 }).map((_, i) => (
											<div
												key={i}
												className="w-1.5 rounded-full bg-linear-to-t from-emerald-500/50 via-emerald-400/80 to-purple-500/50"
												style={{
													height: `${Math.max(20, Math.random() * 100)}%`,
													animation: `pulse 2s infinite ${i * 0.05}s`,
												}}
											/>
										))}
									</div>
								</div>

								{/* Audio Controls */}
								<div className="mt-auto z-20 space-y-4 w-full h-full	">
									{/* Progress Bar */}

									<div className="flex items-center justify-center h-full">
										<div className="flex items-center gap-4">
											<button
												type="button"
												onClick={() => {
													if (!audioUrl) return;
													// Normalize as UserEpisode since we have gcs_audio_url (which corresponds to audioUrl here)
													// This mimics the logic in PlayAndShare for user episodes
													const normalizedEpisode = {
														episode_title: title,
														gcs_audio_url: audioUrl,
														duration_seconds: duration,
														// We need a minimal valid object.
														// ID is usually needed for keys. Use a hash or url if id missing?
														// Ideally we should pass the whole episode object if available.
														// But here we only have detached props.
														episode_id: `preview-${crypto.randomUUID()}`, // Temp ID if none
													};
													// @ts-ignore - we are constructing a partial object, sufficient for player
													setEpisode(normalizedEpisode);
												}}
												className="h-10 w-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-md">
												<Play className="h-4 w-4 fill-white" />
											</button>
										</div>

										<div className="flex items-center gap-4 text-gray-400">
											{/* <Volume2 className="h-4 w-4 hover:text-white cursor-pointer" /> */}
											{/* <MessageSquare className="h-4 w-4 hover:text-white cursor-pointer" /> */}
											{/* <Download className="h-4 w-4 hover:text-white cursor-pointer" /> */}
										</div>
									</div>
								</div>
							</>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Main Grid: Cards */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{documentContradictions && documentContradictions.length > 0 && (
					<Card className="bg-linear-to-br from-amber-500 via-amber-500 lg:col-span-2 to-amber-500/70 border-0 rounded-3xl overflow-hidden relative md:max-h-[400px]">
						<div className="absolute inset-0 bg-linear-to-r from-amber-500/10 to-transparent pointer-events-none" />
						<CardContent className="p-8 relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
							<div className="flex-1 space-y-4">
								<div className="flex items-center gap-3">
									<Target className="h-6 w-6 text-amber-500" />
									<h3 className="text-xl font-bold text-white">Lie Detector</h3>
								</div>

								<div className="space-y-4">
									{documentContradictions.slice(0, 1).map((truth, idx) => (
										<div key={idx} className="space-y-2">
											<div className="flex items-center gap-3">
												<div className="text-2xl font-bold tracking-tighter text-white">
													<span className="text-amber-300">Claim:</span> "{truth.claim}"
												</div>

												<Badge
													variant="secondary"
													className={cn(
														"uppercase min-w-[60px] text-[9px] font-bold px-2 py-0.5 tracking-narrow",
														truth.severity === "CRITICAL"
															? "bg-red-500/80 text-red-200"
															: "bg-emerald-500/80 text-emerald-200"
													)}>
													{truth.severity}
												</Badge>
											</div>
											<p className="text-gray-300  leading-relaxed max-w-2xl">
												{truth.groundTruth}
											</p>
										</div>
									))}
								</div>
							</div>
						</CardContent>
					</Card>
				)}
				{/* Trade Ideas Card (Full Width Highlight) */}
				{tradeRecommendations && tradeRecommendations.length > 0 && (
					<Card className="bg-linear-to-br lg:col-span-1 from-emerald-500/20 via-purple-500/20 to-indigo-500/10 border-0 rounded-3xl overflow-hidden relative">
						<div className="absolute inset-0 bg-linear-to-r from-emerald-500/10 to-transparent pointer-events-none" />
						<CardContent className="p-8 relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
							<div className="flex-1 space-y-4">
								<div className="flex items-center gap-3">
									<Target className="h-6 w-6 text-emerald-400" />
									<h3 className="text-xl font-bold text-white">Trade Ideas</h3>
								</div>

								<div className="space-y-4">
									{tradeRecommendations.slice(0, 1).map((trade, idx) => (
										<div key={idx} className="space-y-2">
											<div className="flex items-center gap-3">
												<span className="text-2xl font-bold tracking-tighter text-white">
													{trade.ticker}
												</span>
												<Badge
													variant="secondary"
													className={cn(
														"uppercase text-[10px] font-bold px-2 py-0.5 tracking-wider",
														trade.direction === "LONG"
															? "bg-emerald-500/20 text-emerald-300"
															: "bg-red-500/20 text-red-300"
													)}>
													{trade.direction} {trade.conviction} CONVICTION
												</Badge>
											</div>
											<p className="text-gray-300  leading-relaxed text-sm max-w-2xl">
												{trade.rationale}
											</p>
										</div>
									))}
								</div>
								<div className="flex flex-col md:flex-row items-start gap-0 md:gap-2 md:items-center">
									<Button
										onClick={() => {
											window.open(
												`https://finance.yahoo.com/quote/${tickers[0]?.replace(/^\$/, "")}/key-statistics/`,
												"_blank"
											);
										}}
										className="rounded-full px-6 bg-[#222] hover:bg-[#333] text-white border-0 transition-all font-medium"
										size="lg">
										View Statistics
										<ArrowRight className="ml-2 h-4 w-4" />
									</Button>

									<Button
										onClick={() => {
											window.open(
												`https://polymarket.com/search?_q=${tickers[0]?.replace(/^\$/, "")}`,
												"_blank"
											);
										}}
										className="rounded-full px-6 bg-[#222] hover:bg-[#333] text-white border-0 transition-all font-medium"
										size="lg">
										View Predictions
										<ArrowRight className="ml-2 h-4 w-4" />
									</Button>
								</div>
							</div>
						</CardContent>
					</Card>
				)}
				{/* Key Asset Performance (Chart) */}
				<Card className="bg-[#111] border border-white/5 rounded-3xl overflow-hidden lg:col-span-2 hover:border-white/10 transition-colors min-h-[300px] flex flex-col">
					<CardHeader className="flex flex-row items-center justify-between pb-2 pt-6 px-6">
						<CardTitle className="text-lg font-bold text-gray-100 flex flex-col">
							<span>Key Asset Performance</span>
							<span className="text-2xl font-mono text-amber-200 font-normal mt-1">
								{tickers?.[0] || "MARKET"}
							</span>
						</CardTitle>
						<div className="flex items-center gap-3">
							{latestPrice && (
								<span className="text-3xl font-bold tracking-tight text-[#72e1ee]">
									${latestPrice.toLocaleString()}
								</span>
							)}
							<BarChart3 className="h-5 w-5 text-gray-500" />
						</div>
					</CardHeader>
					<CardContent className="px-6 pb-6 flex-1 w-full min-h-[200px]">
						<ResponsiveContainer width="100%" height="100%" minHeight={200}>
							<LineChart
								data={chartData && chartData.length > 0 ? chartData : MOCK_CHART_DATA}>
								<defs>
									<linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#72e1ee" stopOpacity={0.3} />
										<stop offset="95%" stopColor="#72e1ee" stopOpacity={0} />
									</linearGradient>
								</defs>
								<XAxis
									dataKey="day"
									stroke="#fff"
									fontSize={12}
									tickLine={false}
									axisLine={false}
									minTickGap={24}
								/>
								<YAxis
									stroke="#374151"
									fontSize={12}
									tickLine={false}
									axisLine={false}
									tickFormatter={val => `$${val}`}
									domain={["auto", "auto"]}
									width={40}
								/>
								<Tooltip
									contentStyle={{
										backgroundColor: "#1f2937",
										border: "none",
										borderRadius: "8px",
										color: "#fff",
									}}
									itemStyle={{ color: "#4ade80" }}
								/>
								<Line
									type="monotone"
									dataKey="value"
									stroke="#b272ee"
									strokeWidth={2}
									dot={false}
									activeDot={{ r: 4, fill: "#fff" }}
								/>
							</LineChart>
						</ResponsiveContainer>
					</CardContent>
				</Card>

				{/* Sentiment Gauge Card */}
				<Card className="bg-[#111] border-none shadow-2xl rounded-3xl p-6 flex flex-col lg:col-span-1 items-center justify-center relative">
					<div className="relative w-40 h-40 flex items-center justify-center">
						<ResponsiveContainer width="100%" height="100%">
							<PieChart>
								<Pie
									data={[{ value: 100 }]}
									dataKey="value"
									cx="50%"
									cy="50%"
									innerRadius={60}
									outerRadius={72}
									startAngle={180}
									endAngle={-180}
									fill="#1f2937" // dark gray bg ring
									stroke="none"
									isAnimationActive={false}
								/>
								<Pie
									data={sentimentData}
									dataKey="value"
									cx="50%"
									cy="50%"
									innerRadius={60}
									outerRadius={72}
									startAngle={90}
									endAngle={-270}
									cornerRadius={10}
									paddingAngle={0}
									stroke="none">
									<Cell key="val" fill={sentimentColor} />
									<Cell key="rem" fill="transparent" />
								</Pie>
							</PieChart>
						</ResponsiveContainer>
						{/* Centered Text */}
						<div className="absolute inset-0 flex items-center justify-center">
							<span className="text-3xl font-bold" style={{ color: sentimentColor }}>
								{sentimentPercentage}%
							</span>
						</div>
					</div>

					<div className="text-center mt-2">
						<p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">
							Source Sentiment
						</p>
						<p
							className="text-lg font-bold tracking-tight uppercase"
							style={{ color: sentimentColor }}>
							{sentimentLabel}
						</p>
					</div>

					<div className="mt-6 pt-4 border-t border-gray-800 w-full">
						<div className="flex justify-between items-center text-xs">
							<span className="text-gray-500">Key assets:</span>
							<div className="flex gap-1 overflow-hidden">
								{tickers?.slice(0, 3).map((t, i) => (
									<span key={i} className="text-gray-300 font-medium font-mono">
										{t}
										{i < Math.min(tickers.length, 3) - 1 ? "," : ""}
									</span>
								))}
							</div>
						</div>
					</div>
				</Card>
				{/* Investment Implications */}
				<Card className="bg-[#111] border border-white/5 rounded-3xl overflow-hidden lg:col-span-3  hover:border-white/10 transition-colors h-auto">
					<CardHeader className="flex flex-row items-center gap-3 pb-2 pt-6 px-6">
						<div className="p-2 bg-gray-800/50 rounded-lg">
							<Lightbulb className="h-5 w-5 text-indigo-400" />
						</div>
						<CardTitle className="text-lg font-bold text-gray-100">
							Investment Implications
						</CardTitle>
					</CardHeader>
					<CardContent className="px-6 pb-6">
						<div className="prose prose-invert prose-sm max-w-none h-fit text-gray-400 leading-relaxed">
							<ReactMarkdown>{investmentImplications}</ReactMarkdown>
						</div>
					</CardContent>
				</Card>

				{/* Risks & Red Flags */}
				<Card className="bg-[#111] border border-white/5 rounded-3xl overflow-hidden  lg:col-span-3 hover:border-white/10 transition-colors">
					<CardHeader className="flex flex-row items-center gap-3 pb-2 pt-6 px-6">
						<div className="p-2 bg-gray-800/50 rounded-lg">
							<AlertTriangle className="h-5 w-5 text-red-500" />
						</div>
						<CardTitle className="text-lg font-bold text-gray-100">
							Risks & Red Flags
						</CardTitle>
					</CardHeader>
					<CardContent className="px-6 pb-6">
						<div className="prose prose-invert prose-sm text-sm max-w-none text-gray-400 leading-relaxed">
							<ReactMarkdown>{risksAndRedFlags}</ReactMarkdown>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
