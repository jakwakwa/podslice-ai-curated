import { ImageResponse } from "next/og";
import { getPublicEpisode, extractCleanDescription } from "@/lib/episodes/public-service";

// Use Node.js runtime to support Prisma
export const runtime = "nodejs";

export const size = {
	width: 1200,
	height: 630,
};

export const contentType = "image/png";
export const alt = "Podslice AI-Curated Episode";

export default async function Image({ params }: { params: { id: string } }) {
	const { id } = await params;
	const episode = await getPublicEpisode(id);

	if (!episode) {
		return new ImageResponse(
			<div
				style={{
					height: "100%",
					width: "100%",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					backgroundColor: "#0f0720",
					color: "white",
				}}>
				<h1>Episode Not Found</h1>
			</div>,
			{ ...size }
		);
	}

	const title = episode.episode_title;
	const description =
		extractCleanDescription(episode.summary, 120) ||
		"Listen to this AI-curated podcast episode on Podslice";
	const date = new Date(episode.created_at).toLocaleDateString("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	return new ImageResponse(
		<div
			style={{
				height: "100%",
				width: "100%",
				display: "flex",
				flexDirection: "column",
				backgroundColor: "#0f0720",
				backgroundImage: "linear-gradient(135deg, #0f0720 0%, #1a0b2e 60%, #312e81 100%)",
				color: "white",
				fontFamily: "sans-serif",
				position: "relative",
			}}>
			{/* Background Elements */}
			<div
				style={{
					position: "absolute",
					top: "0",
					left: "0",
					width: "1200px",
					height: "4px",
					background: "linear-gradient(90deg, #4f46e5, #ec4899)",
				}}
			/>
			{/* Subtle Grid */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					backgroundImage:
						"radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)",
					backgroundSize: "40px 40px",
				}}
			/>

			<div
				style={{
					display: "flex",
					flexDirection: "column",
					justifyContent: "space-between",
					height: "100%",
					padding: "80px",
					zIndex: 10,
				}}>
				{/* Header */}
				<div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="48"
						height="48"
						viewBox="0 0 24 24"
						fill="none"
						stroke="#a5b4fc"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round">
						<path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
						<path d="M8.5 8.5v.01" />
						<path d="M16 16v.01" />
						<path d="M12 12v.01" />
						<path d="M8.5 16v.01" />
						<path d="M16 8.5v.01" />
					</svg>
					<span style={{ fontSize: 32, fontWeight: 700, color: "#a5b4fc" }}>
						Podslice
					</span>
				</div>

				{/* Content */}
				<div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
					<div
						style={{
							fontSize: 24,
							color: "#818cf8",
							textTransform: "uppercase",
							letterSpacing: "0.05em",
							fontWeight: 600,
						}}>
						AI-Curated Episode
					</div>
					<div
						style={{
							fontSize: 72,
							fontWeight: 800,
							lineHeight: 1.1,
							background: "linear-gradient(to bottom right, #ffffff, #c7d2fe)",
							backgroundClip: "text",
							color: "transparent",

							// Line clamp simulation
							display: "-webkit-box",
							overflow: "hidden",
							textOverflow: "ellipsis",
						}}>
						{title}
					</div>
					<div
						style={{ fontSize: 32, color: "#cbd5e1", lineHeight: 1.5, maxWidth: "90%" }}>
						{description}
					</div>
				</div>

				{/* Footer */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "24px",
						marginTop: "auto",
					}}>
					<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
						<div
							style={{
								width: "8px",
								height: "8px",
								borderRadius: "50%",
								background: "#4ade80",
							}}
						/>
						<span style={{ fontSize: 24, color: "#94a3b8" }}>{date}</span>
					</div>
				</div>
			</div>
		</div>,
		{
			...size,
		}
	);
}
