"use client";

import dynamic from "next/dynamic";
import { PAYMENT_CONFIG } from "@/config/ai";

const PaddleControls = dynamic(() => import("../manage-plan/_components/testing/paddle-test-controls").then(mod => mod.SubscriptionTestControlsPaddle), { ssr: false });

export function SubscriptionTestControls() {
	if (!PAYMENT_CONFIG.ENABLE_PADDLE) {
		return null;
	}
	return <PaddleControls />;
}
