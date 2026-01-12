import { NextResponse } from "next/server";
import { Resend } from "resend";
import { EMAIL_TEMPLATES } from "@/src/emails";
import { renderEmail } from "@/src/emails/render";

type DirectBody = {
	to: string;
	subject: string;
	text: string;
	html: string;
};

type TemplateBody = {
	templateId: string;
	to: string;
	props: any;
};

type Body = DirectBody | TemplateBody;

function isTemplateBody(body: Body): body is TemplateBody {
	return "templateId" in body;
}

export async function POST(request: Request) {
	try {
		const authHeader = request.headers.get("x-internal-secret");
		const expected = process.env.INTERNAL_API_SECRET;
		if (!expected || authHeader !== expected) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		if (!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)) {
			return NextResponse.json(
				{ error: "Email service not configured" },
				{ status: 500 }
			);
		}

		const body = (await request.json()) as Body;
		const client = new Resend(process.env.RESEND_API_KEY);

		let to: string;
		let subject: string;
		let text: string;
		let html: string;

		if (isTemplateBody(body)) {
			// Render template in Next.js runtime
			const template = (EMAIL_TEMPLATES as any)[body.templateId];
			if (!template) {
				return NextResponse.json({ error: "Invalid template" }, { status: 400 });
			}

			const rendered = await renderEmail(template.component, body.props);
			to = body.to;
			subject = template.getSubject(body.props);
			text = rendered.text;
			html = rendered.html;
		} else {
			// Direct send with pre-rendered content
			to = body.to;
			subject = body.subject;
			text = body.text;
			html = body.html;
		}

		const result = await client.emails.send({
			from: process.env.EMAIL_FROM,
			to,
			subject,
			text,
			html,
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
