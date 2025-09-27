import Image from "next/image";
import { ImageResponse } from "next/og";


export const size = {
	width: 32,
	height: 32,
};

export const contentType = "image/png";

export default function Icon() {
	return new ImageResponse(
		<div
			style={{
				background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
				width: "100%",
				height: "100%",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				borderRadius: "6px",
			}}>
			<Image src="/favicon.svg" alt="PODSLICE" width={24} height={24} />
		</div>,
		{
			...size,
		}
	);
}
