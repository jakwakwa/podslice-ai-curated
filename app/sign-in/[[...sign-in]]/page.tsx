import { SignIn } from "@clerk/nextjs";
import "@/styles/login.css";
import HomePageBackground from "@/components/containers/home-page-bg";

export default function SignInPage() {
  return (
    <>
      <HomePageBackground />
      <div className="rounded-none backdrop-blur-2xl mix-blend-normal opacity-25 fixed -z-100 min-h-screen" />
      <div className="flex flex-col bg-[var(--sidebar)] content-center items-center justify-center min-h-screen h-fit relative ">
        <div className="background-overlay" />
        <SignIn />
      </div>
    </>
  );
}
