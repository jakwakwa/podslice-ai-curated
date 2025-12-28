import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/app/(protected)/footer";
import { LandingPageHeader } from "@/components/layout/LandingPageHeader";

export const metadata: Metadata = {
	title: "Episode 1: Good News Bad News | Podslice Notes",
	description:
		"Research notes and sources for Episode 1: Why 'Good' Jobs Data Crashed the Market: Fed, Nvidia, and IREN's AI Gamble.",
};

export default function Episode1NotesPage() {
	return (
		<>
			<LandingPageHeader />
			<main className="min-h-screen bg-bigcard pt-24 pb-16">
				<div className="containe  mx-auto px-4 max-w-4xl">
					<h1 className="text-3xl md:text-4xl font-bold mb-8 text-foreground">
						Episode 1: Good News Bad News
					</h1>

					{/* Video Embed */}
					<div className="aspect-video w-full mb-12 rounded-xl overflow-hidden border border-border shadow-lg">
						<iframe
							className="w-full h-full"
							src="https://www.youtube.com/embed/98_n1y0pWtI"
							title="Why 'Good' Jobs Data Crashed the Market: Fed, Nvidia, and IREN's AI Gamble"
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
							referrerPolicy="strict-origin-when-cross-origin"
							allowFullScreen
						/>
					</div>

					<div className="prose prose-invert max-w-none">
						<h3 className="text-2xl font-semibold mb-6 flex items-center gap-2">
							<span>🔗</span> Research & Sources
						</h3>

						<p className="text-muted-foreground mb-6">
							We used these reports and articles to shape our discussion on macro trends,
							Bitcoin correlation, and the AI pivot:
						</p>

						<div className="space-y-8">
							<section>
								<h4 className="text-xl font-semibold mb-4 text-foreground-muted">
									Macroeconomics & Market Reaction
								</h4>
								<ul className="list-disc pl-5 space-y-2 text-muted-foreground">
									<li>
										<Link
											href="https://cryptodnes.bg/en/bitcoin-plunges-below-87000-as-confusing-u-s-jobs-data-clouds-fed-rate-decision/"
											target="_blank"
											rel="noopener noreferrer"
											className="text-amber-400 hover:text-amber-300 hover:underline">
											Bitcoin Plunges Below $87,000 as Confusing U.S. Jobs Data Clouds Fed
											Rate Decision
										</Link>
									</li>
									<li>
										<Link
											href="https://www.morningstar.com/news/dow-jones/202511203909/north-american-morning-briefing-ai-bubble-worries-ease-focus-turns-to-jobs-report"
											target="_blank"
											rel="noopener noreferrer"
											className="text-amber-400 hover:text-amber-300 hover:underline">
											North American Morning Briefing: AI Bubble Worries Ease, Focus Turns
											to Jobs Report
										</Link>
									</li>
									<li>
										<Link
											href="https://www.theguardian.com/commentisfree/2025/nov/18/the-guardian-view-on-cryptos-latest-crash-it-reveals-who-pays-the-price-for-a-failing-economy"
											target="_blank"
											rel="noopener noreferrer"
											className="text-amber-400 hover:text-amber-300 hover:underline">
											The Guardian view on crypto’s latest crash: it reveals who pays the
											price for a failing economy
										</Link>
									</li>
									<li>
										<Link
											href="https://www.investing.com/analysis/the-1-billion-company-that-controls-what-ai-giants-cant-buy-200669867"
											target="_blank"
											rel="noopener noreferrer"
											className="text-amber-400 hover:text-amber-300 hover:underline">
											The $1 Billion Company That Controls What AI Giants Can't Buy |
											Investing.com
										</Link>
									</li>
								</ul>
							</section>

							<section>
								<h4 className="text-xl font-semibold mb-4 text-foreground-muted">
									IREN & Miner Analysis
								</h4>
								<ul className="list-disc pl-5 space-y-2 text-muted-foreground">
									<li>
										<Link
											href="https://irisenergy.gcs-web.com/news-releases/news-release-details/iren-reports-q3-fy25-results/"
											target="_blank"
											rel="noopener noreferrer"
											className="text-amber-400 hover:text-amber-300 hover:underline">
											IREN Reports Q3 FY25 Results
										</Link>
									</li>
									<li>
										<Link
											href="https://www.nasdaq.com/articles/how-can-irens-transition-ai-cloud-benefit-stock"
											target="_blank"
											rel="noopener noreferrer"
											className="text-amber-400 hover:text-amber-300 hover:underline">
											How Can IREN's Transition Into the AI Cloud Benefit the stock? -
											Nasdaq
										</Link>
									</li>
									<li>
										<Link
											href="https://www.nasdaq.com/articles/gross-mining-margin-under-stress-bitfarms-transitions-hpc-ai"
											target="_blank"
											rel="noopener noreferrer"
											className="text-amber-400 hover:text-amber-300 hover:underline">
											Gross Mining Margin Under Stress as Bitfarms Transitions to HPC/AI |
											Nasdaq
										</Link>
									</li>
								</ul>
							</section>
						</div>
					</div>
				</div>
			</main>
			<Footer />
		</>
	);
}
