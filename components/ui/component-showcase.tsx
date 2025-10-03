import { Button } from "./button";
import { PageHeader } from "./page-header";
import { Body, H1, H2, H3, Muted } from "./typography";

// This component demonstrates how to use the new unified component system
// It replaces all the scattered styling patterns with consistent components

export function ComponentShowcase() {
	return (
		<div className="p-8 space-y-8">
			{/* Page Headers - replaces all your scattered header styles */}
			<PageHeader title="Welcome to PodSlice" description="Your AI-curated podcast experience" level={1} />

			<PageHeader title="Episodes" description="Discover your personalized episodes" level={2} spacing="tight" />

			{/* Typography - replaces all your scattered text styles */}
			<div className="space-y-4">
				<H1>This is an H1 heading</H1>
				<H2>This is an H2 heading</H2>
				<H3>This is an H3 heading</H3>
				<Body>This is body text with consistent styling</Body>
				<Muted>This is smaller body text</Muted>
				<Muted>This is muted text for secondary information</Muted>
			</div>

			{/* Cards - replaces all your different card implementations */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				{/* Default Card */}
				<div className="rounded-2xl border bg-card content text-card-foreground transition-all duration-200 p-6">
					<H3 className="mb-2">Default Card</H3>
					<Muted>This uses the default card styling</Muted>
				</div>

				{/* Glass Card */}
				<div className="rounded-2xl border border-white/10 bg-card content/25 backdrop-blur-2xl shadow-glass p-6">
					<H3 className="mb-2">Glass Card</H3>
					<Muted>This uses the glass morphism effect</Muted>
				</div>

				{/* Episode Card */}
				<div className="rounded-2xl border bg-linear-to-br from-card/80 via-accent/20 to-muted shadow-episode cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 p-6">
					<H3 className="mb-2">Episode Card</H3>
					<Muted>This uses the episode-specific styling</Muted>
				</div>
			</div>

			{/* Buttons - already using the variant system */}
			<div className="flex flex-wrap gap-4">
				<Button variant="default">Default Button</Button>
				<Button variant="secondary">Secondary Button</Button>
				<Button variant="outline">Outline Button</Button>
				<Button variant="ghost">Ghost Button</Button>
				<Button variant="destructive">Destructive Button</Button>
			</div>

			{/* Example of how this replaces your old patterns */}
			<div className="bg-card content/25 backdrop-blur-sm border border-white/20 rounded-lg p-6">
				<H3 className="mb-4">Migration Benefits</H3>
				<div className="space-y-2">
					<Muted>✅ One Card component instead of 4+ different implementations</Muted>
					<Muted>✅ One Typography system instead of scattered text styles</Muted>
					<Muted>✅ One Header component instead of repeated header patterns</Muted>
					<Muted>✅ Consistent design tokens using your OKLCH colors</Muted>
					<Muted>✅ Type-safe variants with class-variance-authority</Muted>
				</div>
			</div>
		</div>
	);
}
