import { SignIn } from "@clerk/nextjs";
import "@/styles/login.css";

export default function SignInPage() {
	return (
		<>
			{/* <div className="container login-background-base" /> */}
			{/* <div className="grid-bg background-base heroSection rounded-none" /> */}
			{/* <div className="large-blur background-base" /> */}
			{/* <div className="background-overlay" /> */}
			<div className=" flex items-center	 justify-center h-full max-h-[90vh] relative z-10 rounded-none">
				<SignIn />
			</div>
		</>
	);
}
