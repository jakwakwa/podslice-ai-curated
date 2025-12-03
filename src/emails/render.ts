/**
 * Email rendering utilities using @react-email/render
 */

import { render } from "@react-email/render";
import { type ComponentType, createElement } from "react";

export interface RenderedEmail {
	html: string;
	text: string;
}

/**
 * Renders a React Email component to HTML and plain text
 * @param component - The React Email component to render
 * @param props - Props to pass to the component
 * @param options - Rendering options
 * @returns Object with html and text versions
 */
export async function renderEmail<P = Record<string, unknown>>(
	component: ComponentType<P>,
	props: P,
	options?: {
		pretty?: boolean;
	}
): Promise<RenderedEmail> {
	// Render HTML
	const html = await render(createElement(component, props) as React.ReactElement, {
		pretty: options?.pretty ?? process.env.NODE_ENV === "development",
	});

	// Render plain text version
	const text = await render(createElement(component, props) as React.ReactElement, {
		plainText: true,
	});

	return { html, text };
}

/**
 * Synchronous version of renderEmail for use in non-async contexts
 * Note: Uses blocking await internally - use renderEmail when possible
 */
export function renderEmailSync<P = Record<string, unknown>>(
	component: ComponentType<P>,
	props: P,
	options?: {
		pretty?: boolean;
	}
): RenderedEmail {
	// Create element
	const element = createElement(component, props) as React.ReactElement;

	// Render synchronously - this will work because render is actually sync despite typing
	const html = render(element, {
		pretty: options?.pretty ?? process.env.NODE_ENV === "development",
	}) as unknown as string;

	const text = render(element, {
		plainText: true,
	}) as unknown as string;

	return { html, text };
}
