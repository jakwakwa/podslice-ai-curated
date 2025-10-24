import { SignUp } from "@clerk/nextjs";
import "@/styles/login.css";
import HomePageBackground from "@/components/containers/home-page-bg";

export default function SignInPage() {
	return (
		<>
			<HomePageBackground />
			<div className="rounded-none  fixed -z-100 min-h-screen" />
			<div className="flex flex-col bg-gray-900/80 content-center items-center justify-center min-h-screen h-fit relative ">
				<div className="background-overlay" />

				<SignUp />
			</div>
		</>
	);
}
