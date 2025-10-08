/**
 * EmailHeader component
 * Renders the PODSLICE logo and separator at the top of all emails
 */

import { Hr, Img, Link, Section } from "@react-email/components";
import { EMAIL_CONSTANTS, getEmailBaseUrl, getLogoUrl } from "../utils";

export function EmailHeader() {
	const baseUrl = getEmailBaseUrl();
	const logoUrl = getLogoUrl();
	const { width, alt, paddingBottom } = EMAIL_CONSTANTS.LOGO;
	const { color, thickness, marginTop, marginBottom } = EMAIL_CONSTANTS.SEPARATOR;

	return (
		<>
			<Section style={{ textAlign: "center", marginBottom: paddingBottom }}>
				<Link
					href={baseUrl}
					target="_blank"
					style={{
						textDecoration: "none",
						display: "inline-block",
					}}
				>
					<Img
						src={logoUrl}
						alt={alt}
						width={width}
						style={{
							display: "block",
							margin: "0 auto",
							border: 0,
							outline: "none",
							textDecoration: "none",
							height: "auto",
						}}
					/>
				</Link>
			</Section>
			<Hr
				style={{
					border: "none",
					borderTop: `1px solid ${color}`,
					margin: `${marginTop}px 0 ${marginBottom}px`,
					height: `${thickness}px`,
					background: color,
				}}
			/>
		</>
	);
}
