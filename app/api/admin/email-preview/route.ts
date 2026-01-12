import { NextResponse } from "next/server";
import { requireAdminMiddleware } from "@/lib/admin-middleware";
import { getTemplateBySlug } from "@/src/emails";
import { renderEmail } from "@/src/emails/render";

export const runtime = "nodejs";

export async function GET(request: Request) {
	try {
		const adminCheck = await requireAdminMiddleware();
		if (adminCheck) {
			return adminCheck;
		}

		const url = new URL(request.url);
		const slug = url.searchParams.get("slug");

		if (!slug) {
			return NextResponse.json(
				{ message: "Missing 'slug' query param" },
				{ status: 400 }
			);
		}

		const template = getTemplateBySlug(slug);
		if (!template) {
			return NextResponse.json({ message: "Template not found" }, { status: 404 });
		}

		const sampleProps = template.getSampleProps() as Record<string, unknown>;
		const { html } = await renderEmail(
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			template.component as any,
			sampleProps,
			{
				pretty: true,
			}
		);

		return new Response(html, {
			status: 200,
			headers: {
				"Content-Type": "text/html; charset=utf-8",
				// Avoid caching during dev previews
				"Cache-Control": "no-store",
			},
		});
	} catch (error) {
		console.error("[ADMIN_EMAIL_PREVIEW_GET]", error);
		return NextResponse.json(
			{ message: "Failed to render email preview" },
			{ status: 500 }
		);
	}
}
