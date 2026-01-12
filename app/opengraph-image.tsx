import { ImageResponse } from "next/og";

// Route segment config
export const runtime = "edge";

// Image metadata
export const alt = "Podslice - Institutional Intelligence for the Modern Portfolio";
export const size = {
	width: 1200,
	height: 630,
};

export const contentType = "image/png";

// Image generation
export default async function Image() {
	// Using system fonts or a simple sans-serif for speed and reliability in edge
	// ideally we'd load a font, but let's start with a premium css layout

	return new ImageResponse(
		// ImageResponse JSX element
		<div
			style={{
				height: "100%",
				width: "100%",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				backgroundColor: "#0f0720", // Deep purple/black background
				backgroundImage: "linear-gradient(135deg, #0f0720 0%, #1a0b2e 50%, #2e1065 100%)",
				color: "white",
				fontFamily: "sans-serif",
			}}>
			{/* Abstract shapes for visual interest */}
			<div
				style={{
					position: "absolute",
					top: "-100px",
					left: "-100px",
					width: "400px",
					height: "400px",
					borderRadius: "50%",
					background: "rgba(139, 92, 246, 0.2)",
					filter: "blur(80px)",
				}}
			/>
			<div
				style={{
					position: "absolute",
					bottom: "-50px",
					right: "-50px",
					width: "500px",
					height: "500px",
					borderRadius: "50%",
					background: "rgba(79, 70, 229, 0.15)",
					filter: "blur(100px)",
				}}
			/>

			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					zIndex: 10,
					padding: "40px",
					textAlign: "center",
				}}>
				{/* Logo Icon */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						marginBottom: "20px",
					}}>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="80"
						height="80"
						viewBox="0 0 24 24"
						fill="none"
						stroke="white"
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
				</div>

				<div
					style={{
						fontSize: 80,
						fontWeight: 800,
						background: "linear-gradient(to right, #ffffff, #a5b4fc)",
						backgroundClip: "text",
						color: "transparent",
						marginBottom: "20px",
						letterSpacing: "-0.02em",
					}}>
					Podslice
				</div>
				<div
					style={{
						fontSize: 32,
						color: "#cbd5e1",
						maxWidth: "800px",
						lineHeight: 1.4,
						fontWeight: 500,
					}}>
					Turn Information Overload Into Actionable Insight
				</div>
			</div>
		</div>,
		// ImageResponse options
		{
			...size,
		}
	);
}
