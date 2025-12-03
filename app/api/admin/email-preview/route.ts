import { type NextRequest, NextResponse } from "next/server";
import { getTemplateBySlug } from "@/emails";
import { renderEmail } from "@/emails/render";

/**
 * API endpoint for previewing email templates
 * Used by the email management admin panel
 */
export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const slug = searchParams.get("slug");

		if (!slug) {
			return NextResponse.json({ message: "Missing slug parameter" }, { status: 400 });
		}

		const template = getTemplateBySlug(slug);
		if (!template) {
			return NextResponse.json({ message: "Template not found" }, { status: 404 });
		}

		const sampleProps = template.getSampleProps();
		const { html } = await renderEmail(
			template.component as React.ComponentType<unknown>,
			sampleProps,
			{
				pretty: true,
			}
		);

		return new Response(html, {
			headers: {
				"Content-Type": "text/html",
			},
		});
	} catch (error) {
		console.error("Error previewing email:", error);
		return NextResponse.json({ message: "Failed to preview email" }, { status: 500 });
	}
}
