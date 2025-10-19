import { SignUp } from "@clerk/nextjs";
import "@/styles/login.css";

export default function SignInPage() {
	return (
		<>


			{/* <div className="large-blur background-base" /> */}

			<div className=" background-base rounded-none backdrop-blur-2xl mix-blend-normal opacity-25 fixed -z-100 min-h-screen" />
			<div className="flex flex-col bg-gray-900/80 content-center items-center justify-center min-h-screen h-fit relative z-1 mix-blend-screen" >
				{/* <div className="background-overlay" /> */}

				<SignUp />

			</div>

		</>
	);
}
