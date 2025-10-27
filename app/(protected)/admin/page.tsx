import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminIndexPage() {
	return (
		<div className="container mx-auto p-6 max-w-4xl space-y-6">
			<h1 className="text-2xl font-semibold">Admin Portal</h1>
			<Card variant="dunk">
				<CardHeader>
					<CardTitle>Manage</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<ul className="list-disc pl-5 space-y-2">
						<li>
							<Link className="underline" href="/admin/bundles">
								Bundles
							</Link>
						</li>
						<li>
							<Link className="underline" href="/admin/podcasts">
								Podcasts
							</Link>
						</li>
						<li>
							<Link className="underline" href="/admin/episodes">
								Episodes
							</Link>
						</li>
						<li>
							<Link className="underline" href="/admin/email-management">
								Email Management
							</Link>
						</li>
						<li>
							<Link className="underline" href="/admin/audio-duration">
								Audio Duration Extractor
							</Link>
						</li>
					</ul>
				</CardContent>
			</Card>
		</div>
	)
}


