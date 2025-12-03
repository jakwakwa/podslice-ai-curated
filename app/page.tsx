import LandingPageContent from "@/components/containers/landing-page-content";

export default async function LandingPage() {
	// Public landing page - no auth checking needed
	// Users can navigate to login/signup from here
	return <LandingPageContent />;
}
