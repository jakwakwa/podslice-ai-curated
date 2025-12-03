"use client";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = { className?: string };

export function SubscriptionManagement({ className }: Props) {
	return (
		<div className={className}>
			<Card>
				<CardHeader>
					<CardTitle>Subscription Management</CardTitle>
					<CardDescription>
						Temporarily disabled in this build. Subscription store is not available.
					</CardDescription>
				</CardHeader>
			</Card>
		</div>
	);
}
