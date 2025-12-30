import { HeroCarousel } from "@/components/hero-carousel";
import { Header } from "@/components/header";

export default function Home() {
	return (
		<main className="relative">
			<Header />
			<HeroCarousel />
		</main>
	);
}
