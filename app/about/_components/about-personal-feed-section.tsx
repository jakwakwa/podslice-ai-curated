"use client";

import { Radio, Zap } from "lucide-react";

export default function AboutPersonalFeedSection() {
	return (
		<div className="max-w-5x mx-auto grid md:grid-cols-2 gap-8">
			<div className="p-8 bg-card rounded-2xl border border-border hover:border-primary/30 transition-all duration-300">
				<div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-6">
					<Radio className="w-7 h-7 text-blue-400" />
				</div>
				<h3 className="text-2xl font-bold text-cyan-400 mb-4">
					Curated<span>FOR YOU</span> for You
				</h3>
				<p className="text-foreground leading-relaxed">
					Get summaries from popular shows and channels we've already curated for you.
					Just subscribe to our "Bundles" (e.g., "Tech Today," "Wellness Weekly," or
					"Finance Fast-Track"), and new audio and text summaries will appear in your feed
					automatically.
				</p>
			</div>
			<div className="p-8 bg-card rounded-2xl border border-border hover:border-primary/30 transition-all duration-300">
				<div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-6">
					<Zap className="w-7 h-7 text-blue-400" />
				</div>
				<h3 className="text-2xl font-bold text-cyan-400 mb-4">Created by You</h3>
				<p className="text-foreground leading-relaxed">
					This is where the real power lies. Found a 2-hour interview or lecture on
					YouTube? Just paste the link into Podslice. Want to catch up on the latest news?
					Select your topics. Our AI will get to work and create a custom summary (both
					audio and text) just for you.
				</p>
			</div>
		</div>
	);
}
