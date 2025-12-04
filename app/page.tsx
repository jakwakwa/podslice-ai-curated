import { Header } from "@/components/header";
import { HeroCarousel } from "@/components/hero-carousel";

export default function Home() {
	return (
		<main className="relative">
			<Header />
			<HeroCarousel />
		</main>
	);
}
