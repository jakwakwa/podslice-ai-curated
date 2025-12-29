
import { PlanGate, UserEpisodeStatus, UserRole, PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const podcastsSeed = [
	{
		slug: "ai-daily-dispatch",
		name: "AI Daily Dispatch",
		description: "Daily news, research highlights, and analysis on AI breakthroughs.",
		url: "https://podslice.example/podcasts/ai-daily-dispatch",
		image_url: "https://picsum.photos/seed/ai-daily/400/400",
		category: "Technology",
	},
	{
		slug: "builder-blueprint",
		name: "Builder's blueprint",
		description: "Stories and tactics from product builders shipping at scale.",
		url: "https://podslice.example/podcasts/builders-blueprint",
		image_url: "https://picsum.photos/seed/builders-blueprint/400/400",
		category: "Business",
	},
	{
		slug: "design-bites",
		name: "Design Bites",
		description: "Sharp teardowns of standout product and brand experiences.",
		url: "https://podslice.example/podcasts/design-bites",
		image_url: "https://picsum.photos/seed/design-bites/400/400",
		category: "Design",
	},
	{
		slug: "future-of-workshop",
		name: "Future of Workshop",
		description: "How teams experiment with AI, automation, and new workflows.",
		url: "https://podslice.example/podcasts/future-of-workshop",
		image_url: "https://picsum.photos/seed/future-of-workshop/400/400",
		category: "Technology",
	},
	{
		slug: "marketing-signals",
		name: "Marketing Signals",
		description: "Weekly trends on growth loops, channels, and customer retention.",
		url: "https://podslice.example/podcasts/marketing-signals",
		image_url: "https://picsum.photos/seed/marketing-signals/400/400",
		category: "Business",
	},
]

const bundlesSeed = [
	{
		bundle_id: "seed-free-slice-weekly",
		name: "Free Slice Weekly",
		description: "A rotating sampler of high-signal pods available to every member.",
		image_url: "https://picsum.photos/seed/free-slice-weekly/600/400",
		min_plan: PlanGate.NONE,
		podcastSlugs: ["ai-daily-dispatch", "design-bites"],
	},
	{
		bundle_id: "seed-product-pulse",
		name: "Product Pulse Essentials",
		description: "A product-led mix for shipping teams and product strategists.",
		image_url: "https://picsum.photos/seed/product-pulse/600/400",
		min_plan: PlanGate.CASUAL_LISTENER,
		podcastSlugs: ["builder-blueprint", "future-of-workshop"],
	},
	{
		bundle_id: "seed-curators-choice",
		name: "Curator's Choice",
		description: "Premium, human-curated shows with member-only commentary and briefs.",
		image_url: "https://picsum.photos/seed/curators-choice/600/400",
		min_plan: PlanGate.CURATE_CONTROL,
		podcastSlugs: ["ai-daily-dispatch", "future-of-workshop", "marketing-signals"],
	},
]

const bundleEpisodesSeed = [
	{
		episode_id: "seed-bundle-episode-001",
		title: "AI Daily Dispatch • Research Radar",
		description: "A tight 12-minute rundown on the five AI papers shaping product bets this week.",
		audio_url: "https://storage.googleapis.com/podslice-demo/audio/ai-daily-research-radar.mp3",
		image_url: "https://picsum.photos/seed/ai-episode-cover/600/600",
		duration_seconds: 720,
		published_at: new Date("2024-09-09T12:00:00.000Z"),
		podcastSlug: "ai-daily-dispatch",
		bundleKey: "seed-curators-choice",
	},
	{
		episode_id: "seed-bundle-episode-002",
		title: "Future of Workshop • Team Ops in an AI Era",
		description: "Leaders from fast-moving teams share process upgrades that actually stuck.",
		audio_url: "https://storage.googleapis.com/podslice-demo/audio/future-workshop-team-ops.mp3",
		image_url: "https://picsum.photos/seed/workshop-episode/600/600",
		duration_seconds: 945,
		published_at: new Date("2024-09-05T16:30:00.000Z"),
		podcastSlug: "future-of-workshop",
		bundleKey: "seed-product-pulse",
	},
	{
		episode_id: "seed-bundle-episode-003",
		title: "Design Bites • Interfaces Worth Studying",
		description: "Snappy breakdowns of three interfaces pushing clarity and delight.",
		audio_url: "https://storage.googleapis.com/podslice-demo/audio/design-bites-interfaces.mp3",
		image_url: "https://picsum.photos/seed/design-episode/600/600",
		duration_seconds: 660,
		published_at: new Date("2024-09-02T08:45:00.000Z"),
		podcastSlug: "design-bites",
		bundleKey: "seed-free-slice-weekly",
	},
]

const userEpisodesSeed = [
	{
		episode_id: "seed-user-episode-001",
		episode_title: "AI Launchpad • Week in Review",
		youtube_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
		summary: "Ten-minute highlight reel covering foundation model launches, policy shifts, and shipping tactics.",
		gcs_audio_url: "gs://podslice-demo/user-episodes/ai-launchpad-weekly.mp3",
		duration_seconds: 780,
		status: UserEpisodeStatus.COMPLETED,
	},
	{
		episode_id: "seed-user-episode-002",
		episode_title: "Product Pulse • Interviews to Watch",
		youtube_url: "https://www.youtube.com/watch?v=Zi_XLOBDo_Y",
		summary: "Rough cut of interviews queued for synthesis. Auto-summarization still running.",
		gcs_audio_url: null,
		duration_seconds: null,
		status: UserEpisodeStatus.PROCESSING,
	},
]

async function main() {
	console.log("🌱 Seeding PODSLICE demo data aligned with the dashboard UI…")

	// Ensure demo user exists with highest plan for full UI coverage
	const demoUser = await prisma.user.upsert({
		where: { email: "demo@podslice.ai" },
		update: {
			name: "Demo Curator",
			password: "demo-password",
			image: "https://picsum.photos/seed/podslice-demo-user/200/200",
			is_admin: true,
			role: UserRole.ADMIN,
		},
		create: {
			name: "Demo Curator",
			email: "demo@podslice.ai",
			password: "demo-password",
			image: "https://picsum.photos/seed/podslice-demo-user/200/200",
			is_admin: true,
			role: UserRole.ADMIN,
		},
	})

	await prisma.subscription.deleteMany({ where: { user_id: demoUser.user_id } })
	await prisma.subscription.create({
		data: {
			user_id: demoUser.user_id,
			plan_type: "curate_control",
			status: "active",
			paddle_subscription_id: "demo-subscription",
			paddle_price_id: "price_demo_curate_control",
			current_period_start: new Date("2024-09-01T00:00:00.000Z"),
			current_period_end: new Date("2024-10-01T00:00:00.000Z"),
		},
	})
	console.log("✓ Demo user and subscription ready")

	const podcastsBySlug = new Map()
	for (const podcast of podcastsSeed) {
		const record = await prisma.podcast.upsert({
			where: { url: podcast.url },
			update: {
				name: podcast.name,
				description: podcast.description,
				image_url: podcast.image_url,
				category: podcast.category,
				is_active: true,
				owner_user_id: podcast.slug === "builder-blueprint" ? demoUser.user_id : null,
			},
			create: {
				name: podcast.name,
				description: podcast.description,
				url: podcast.url,
				image_url: podcast.image_url,
				category: podcast.category,
				owner_user_id: podcast.slug === "builder-blueprint" ? demoUser.user_id : null,
			},
		})
		podcastsBySlug.set(podcast.slug, record)
	}
	console.log("✓ Podcasts seeded")

	const bundlesById = new Map()
	for (const bundle of bundlesSeed) {
		const record = await prisma.bundle.upsert({
			where: { bundle_id: bundle.bundle_id },
			update: {
				name: bundle.name,
				description: bundle.description,
				min_plan: bundle.min_plan,
				is_active: true,
			},
			create: {
				bundle_id: bundle.bundle_id,
				name: bundle.name,
				description: bundle.description,
				min_plan: bundle.min_plan,
			},
		})

		await prisma.bundlePodcast.deleteMany({ where: { bundle_id: record.bundle_id } })
		const relationships = bundle.podcastSlugs
			.map(slug => podcastsBySlug.get(slug))
			.filter(Boolean)
			.map(podcast => ({ bundle_id: record.bundle_id, podcast_id: podcast.podcast_id }))

		if (relationships.length > 0) {
			await prisma.bundlePodcast.createMany({ data: relationships, skipDuplicates: true })
		}

		bundlesById.set(bundle.bundle_id, record)
	}
	console.log("✓ Bundles and bundle ↔ podcast mappings seeded")

	// Refresh curated episodes tied to bundles and podcasts
	for (const episode of bundleEpisodesSeed) {
		const podcast = podcastsBySlug.get(episode.podcastSlug)
		const bundle = bundlesById.get(episode.bundleKey)
		if (!podcast || !bundle) continue

		await prisma.episode.upsert({
			where: { episode_id: episode.episode_id },
			update: {
				title: episode.title,
				description: episode.description,
				audio_url: episode.audio_url,
				image_url: episode.image_url,
				duration_seconds: episode.duration_seconds,
				published_at: episode.published_at,
				podcast_id: podcast.podcast_id,
				bundle_id: bundle.bundle_id,
			},
			create: {
				episode_id: episode.episode_id,
				podcast_id: podcast.podcast_id,
				bundle_id: bundle.bundle_id,
				title: episode.title,
				description: episode.description,
				audio_url: episode.audio_url,
				image_url: episode.image_url,
				duration_seconds: episode.duration_seconds,
				published_at: episode.published_at,
			},
		})
	}
	console.log("✓ Curated bundle episodes ready")

	// Prepare demo user's curated profile
	await prisma.userCurationProfile.deleteMany({ where: { user_id: demoUser.user_id } })
	const selectedBundle = bundlesById.get("seed-curators-choice")
	const userProfile = await prisma.userCurationProfile.create({
		data: {
			profile_id: "seed-user-profile-demo",
			user_id: demoUser.user_id,
			name: "Demo AI Insights",
			status: "Active",
			is_active: true,
			is_bundle_selection: true,
			selected_bundle_id: selectedBundle ? selectedBundle.bundle_id : null,
			generated_at: new Date("2024-09-08T10:00:00.000Z"),
			last_generation_date: new Date("2024-09-15T10:00:00.000Z"),
			next_generation_date: new Date("2024-09-22T10:00:00.000Z"),
		},
	})
	console.log("✓ User curation profile created")

	const profileEpisodesSeed = [
		{
			episode_id: "seed-profile-episode-001",
			title: "Demo AI Insights • Founder Standups",
			description: "Clips from three founder interviews distilled into one actionable summary.",
			audio_url: "https://storage.googleapis.com/podslice-demo/audio/demo-profile-founder-standups.mp3",
			image_url: "https://picsum.photos/seed/profile-episode-1/600/600",
			duration_seconds: 810,
			published_at: new Date("2024-09-14T09:00:00.000Z"),
			podcastSlug: "ai-daily-dispatch",
		},
		{
			episode_id: "seed-profile-episode-002",
			title: "Demo AI Insights • Ops Playbook",
			description: "A snackable walkthrough of playbooks teams use to blend human + AI workflows.",
			audio_url: "https://storage.googleapis.com/podslice-demo/audio/demo-profile-ops-playbook.mp3",
			image_url: "https://picsum.photos/seed/profile-episode-2/600/600",
			duration_seconds: 690,
			published_at: new Date("2024-09-11T17:30:00.000Z"),
			podcastSlug: "future-of-workshop",
		},
	]

	for (const episode of profileEpisodesSeed) {
		const podcast = podcastsBySlug.get(episode.podcastSlug)
		if (!podcast) continue
		await prisma.episode.upsert({
			where: { episode_id: episode.episode_id },
			update: {
				title: episode.title,
				description: episode.description,
				audio_url: episode.audio_url,
				image_url: episode.image_url,
				duration_seconds: episode.duration_seconds,
				published_at: episode.published_at,
				podcast_id: podcast.podcast_id,
				profile_id: userProfile.profile_id,
			},
			create: {
				episode_id: episode.episode_id,
				podcast_id: podcast.podcast_id,
				title: episode.title,
				description: episode.description,
				audio_url: episode.audio_url,
				image_url: episode.image_url,
				duration_seconds: episode.duration_seconds,
				published_at: episode.published_at,
				profile_id: userProfile.profile_id,
			},
		})
	}
	console.log("✓ Personalized profile episodes seeded")

	await prisma.userEpisode.deleteMany({ where: { user_id: demoUser.user_id } })
	for (const episode of userEpisodesSeed) {
		await prisma.userEpisode.upsert({
			where: { episode_id: episode.episode_id },
			update: {
				episode_title: episode.episode_title,
				youtube_url: episode.youtube_url,
				summary: episode.summary,
				gcs_audio_url: episode.gcs_audio_url,
				duration_seconds: episode.duration_seconds,
				status: episode.status,
				user_id: demoUser.user_id,
			},
			create: {
				episode_id: episode.episode_id,
				user_id: demoUser.user_id,
				episode_title: episode.episode_title,
				youtube_url: episode.youtube_url,
				summary: episode.summary,
				gcs_audio_url: episode.gcs_audio_url,
				duration_seconds: episode.duration_seconds,
				status: episode.status,
			},
		})
	}
	console.log("✓ User-generated summaries seeded")

	console.log("🌱 Demo data installed successfully. Happy slicing! 🎧")
}

main()
	.catch(error => {
		console.error("❌ Seed failed", error)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
