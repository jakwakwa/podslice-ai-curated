import { SignUp } from "@clerk/nextjs"

export default function SignUpPage() {
	return (
		<div
			style={{
				display: "flex",
				minHeight: "100vh",
				alignItems: "center",
				justifyContent: "center",
				background: "oklch(var(--background))",
			}}
		>
			<SignUp />
		</div>
	)
}
