import { SignUp } from "@clerk/nextjs";
import "@/styles/login.css";

export default function SignInPage() {
	return (
		<>

			{/* <div className="grid-bg background-base heroSection  rounded-none" /> */}
			{/* <div className="large-blur background-base" /> */}
			{/* <div className="background-overlay" /> */}


			<div className="grid-bg background-base heroSection rounded-none max-h-screen" />
			{/* <div className="large-blur background-base" /> */}
			{/* <div className="background-overlay" /> */}
			<div className=" flex items-center	 justify-center   min-h-screen relative z-10 rounded-none">
				<SignUp />

			</div>

		</>
	);
}
