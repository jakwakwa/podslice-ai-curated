declare module "motion/react" {
	export interface Transition {
		type?: string;
		stiffness?: number;
		damping?: number;
		delay?: number;
		restDelta?: number;
	}
	export interface Variants {
		[key: string]:
			| Record<string, unknown>
			| ((...args: unknown[]) => Record<string, unknown>);
	}
	export const AnimatePresence: React.ComponentType<{
		children?: React.ReactNode;
		initial?: boolean;
	}>;
}

declare module "motion/react-client" {
	export const div: React.ComponentType<{
		key?: string;
		initial?: Record<string, unknown>;
		animate?: Record<string, unknown> | string;
		exit?: Record<string, unknown>;
		transition?: import("motion/react").Transition;
		className?: string;
		children?: React.ReactNode;
	}>;
	export default {} as unknown as { div: typeof div };
}
