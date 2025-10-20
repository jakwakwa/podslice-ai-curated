import { NextResponse } from "next/server";
import { Resend } from "resend";

type Body = {
	to: string;
	subject: string;
	text: string;
	html: string;
};

export async function POST(request: Request) {
	try {
		const authHeader = request.headers.get("x-internal-secret");
		const expected = process.env.INTERNAL_API_SECRET;
		if (!expected || authHeader !== expected) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
			return NextResponse.json(
				{ error: "Email service not configured" },
				{ status: 500 }
			);
		}

		const body = (await request.json()) as Body;
		const client = new Resend(process.env.RESEND_API_KEY);
		const result = await client.emails.send({
			from: process.env.EMAIL_FROM,
			to: body.to,
			subject: body.subject,
			text: body.text,
			html: body.html,
		});

		if ((result as { error?: unknown }).error) {
			return NextResponse.json({ error: "Resend send error" }, { status: 500 });
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("[INTERNAL_SEND_EMAIL]", error);
		return NextResponse.json({ error: "Failed" }, { status: 500 });
	}
}


