import { redirect } from "next/navigation";
import { getClerkSignInUrl } from "@/lib/env";

export default function LoginAlias() {
	redirect(getClerkSignInUrl());
}
