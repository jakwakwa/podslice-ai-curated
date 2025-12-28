import { cva, type VariantProps } from "class-variance-authority";

// Typography variants - unified text styling system
export const typographyVariants = cva("", {
	variants: {
		variant: {
			h1: "font-bold font-heading",
			h2: " font-bold leading-[1.5]",
			h3: "font-bold my-0 leading-[1]",
			h4: " font-bold",
			h5: "uppercase font-semibold leading-[4px]",
			body: "font-sans leading-[1.5]",
			muted: "text-[var(--text-body-sm)] text-muted-foreground",
			link: "text-[var(--text-body-sm)] text-link",
			label: "text-[var(--text-body-sm)] text-label",
			caption: "text-[var(--text-body-sm)] text-caption",
		},
	},
});

// Card variants - ONE unified card system to replace all your different card i
export interface CardVariantProps extends React.HTMLAttributes<HTMLDivElement> {
	variant: "bundle" | "default";
	hoverable: boolean;
	selected: boolean;
	className: string;
}

export const cardVariants = cva("", {
	variants: {
		variant: {
			default: "bg-card backdrop-filter-2xl rounded-xl border text-card-foreground px-4",
			glass:
				"md:bg-background/80 md:backdrop-blur-[44px] border text-card-foreground px-4",
			transparent: "main-card",
			bundle:
				"  border-2 border-bundle-card-border w-full transition-shadow duration-200 gap-3 bundle-card-hover xl:max-w-[500px]  xl:overflow-hidden rounded-xl ease-in-out text-shadow-sm shadow-[0_4px_4px_1px_#0506062c]",
		},
		selected: {
			true: "border-2",
			false: " border-1 border-bundle-card-border",
		},
		hoverable: {
			true: "hover:shadow-xl hover:-translate-y-1 transition duration-300 ease-in-out hover:bg-azure-500/90 cursor-pointer",
			false: "",
		},
	},
	compoundVariants: [
		{
			selected: true,
			hoverable: true,
			className:
				"hover:shadow-xl hover:shadow-accent-selection-bg/30 hover:-translate-y-1",
		},
	],
	defaultVariants: {
		variant: "default",
		selected: false,
		hoverable: false,
	},
});

// Header variants - ONE unified header system to replace all your repeated header styles
export const headerVariants = cva("text-left", {
	variants: {
		spacing: {
			tight: "mb-4",
			default: "mb-0 my-8 px-4 flex flex-col gap-2",
			loose: "mb-12",
		},
	},
	defaultVariants: {
		spacing: "default",
	},
});

// Input variants - unified form field styling
export const inputVariants = cva(" ", {
	variants: {
		variant: {
			default:
				"bg-[#2a1f3d] border-[var(--color-form-border)] text-[var(--color-form-input-text)] placeholder:text-[var(--color-form-placeholder)] focus:border-[var(--color-form-border-focus)] focus:ring-[3px] focus:ring-[var(--color-form-focus-ring)] active:border-[var(--color-form-border-active)] disabled:bg-[var(--color-form-bg-disabled)] disabled:border-[var(--color-form-border-disabled)] disabled:text-[var(--color-form-text-disabled)] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-[var(--color-form-error-border)] aria-invalid:ring-[3px] aria-invalid:ring-[var(--color-form-error-ring)]",
			glass:
				"bg-[var(--color-form-input-bg)]/50 backdrop-blur-lg border-white/20 text-[var(--color-form-input-text)] placeholder:text-[var(--color-form-placeholder)] focus:border-[var(--color-form-border-focus)] focus:ring-[3px] focus:ring-[var(--color-form-focus-ring)]",
		},
		size: {
			default: "h-9 px-3 md:px-4 py-2 text-sm",
			sm: "h-8 px-2 md:px-3 py-1 text-xs",
			lg: "h-12 px-4 md:px-6 py-3 text-base",
		},
	},
	defaultVariants: {
		variant: "default",
		size: "default",
	},
});

// Textarea variants - consistent with input styling
export const textareaVariants = cva(
	"flex min-h-[60px] w-full rounded-md border resize-vertical transition-all duration-200 outline-none selection:bg-background/20  selection:text-primary-foreground",
	{
		variants: {
			variant: {
				default:
					"bg-[#2a1f3d] border-[var(--color-form-border)] text-[var(--color-form-input-text)] placeholder:text-[var(--color-form-placeholder)] focus:border-[var(--color-form-border-focus)] focus:ring-[3px] focus:ring-[var(--color-form-focus-ring)] active:border-[var(--color-form-border-active)] disabled:bg-[var(--color-form-bg-disabled)] disabled:border-[var(--color-form-border-disabled)] disabled:text-[var(--color-form-text-disabled)] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-[var(--color-form-error-border)] aria-invalid:ring-[3px] aria-invalid:ring-[var(--color-form-error-ring)]",
			},
			size: {
				default: "px-3 py-2 text-sm",
				sm: "px-2 py-1 text-xs",
				lg: "px-4 py-3 text-base",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	}
);

// Select variants - dropdown form styling
export const selectVariants = cva("", {
	variants: {
		trigger: {
			default:
				"flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border bg-[oklch(0.30_0.1388_290.83/0.28)] border-[var(--color-form-border)] px-3 py-2 text-sm text-[var(--color-form-input-text)] shadow-xs outline-none transition-all duration-200 data-[placeholder]:text-[var(--color-form-placeholder)] focus:border-[var(--color-form-border-focus)] focus:ring-[3px] focus:ring-[var(--color-form-focus-ring)] disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:opacity-50",
		},
		content: {
			default:
				"relative z-1000 max-h-96 min-w-32 overflow-hidden rounded-md border bg-background/20  text-foreground shadow-md animate-in fade-in-0 zoom-in-95",
		},
	},
	defaultVariants: {
		trigger: "default",
		content: "default",
	},
});

// Switch variants - toggle component styling
export const switchVariants = cva(
	"popper inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ",
	{
		variants: {
			variant: {
				default: "data-[state=checked]:bg-none data-[state=unchecked]:bg-none",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	}
);

// Badge variants - status and label styling
export const badgeVariants = cva(
	" w-fit  flex items-center justify-center rounded  px-0.5 py-0.8 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 leading-none border-custom-sm",
	{
		variants: {
			variant: {
				default: " bg-red text-primary-foreground shadow",
				secondary: " tbg-red  ext-primary-foreground min-h-[initial]",
				destructive:
					" bg-destructive text-destructive-foreground shadow min-h-[initial]	",
				outline: "text-foreground border-1 border-foreground/40 min-h-[initial]",
				card: " my-0 bg-[rgba(27 27 182 / 0.76) text-card-foreground shadow-sm min-h-[initial]",
				primarycard: "bg-red  min-h-[initial]",
			},
			size: {
				sm: "px-0 py-[2px] text-xs h-fit leading-none",
				md: "px-1 py-1 text-xs h-fit",
				lg: "px-3 py-3 text-sm h-fit leading-none",
				xl: "px-4 py-4 text-sm h-fit leading-none",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "lg",
		},
	}
);

// Avatar variants - profile picture styling
export const avatarVariants = cva(
	"relative flex shrink-0 overflow-hidden rounded-full content-center items-center justify-center",
	{
		variants: {
			size: {
				default: "h-6 w-6 md:h-10 md:w-10	overflow-hidden	",
				sm: "h-6 w-6 md:h-10 md:w-10 rounded-full",
				lg: "h-6 w-6 md:h-12 md:w-12 rounded-full",
				xl: "h-6 w-6 md:h-16 md:w-16 rounded-full",
			},
		},
		defaultVariants: {
			size: "default",
		},
	}
);

export type TypographyProps = VariantProps<typeof typographyVariants>;
export type CardProps = VariantProps<typeof cardVariants>;
export type HeaderProps = VariantProps<typeof headerVariants>;
export type InputProps = VariantProps<typeof inputVariants>;
export type TextareaProps = VariantProps<typeof textareaVariants>;
export type SelectProps = VariantProps<typeof selectVariants>;
export type SwitchProps = VariantProps<typeof switchVariants>;
export type BadgeProps = VariantProps<typeof badgeVariants>;
// Spinner variants - loading indicators with animations
export const spinnerVariants = cva("", {
	variants: {
		size: {
			xs: "w-2 h-2",
			xxs: "w-1 h-1",
			sm: "w-4 h-4",
			md: "w-8 h-8",
			lg: "w-12 h-12",
		},
		color: {
			default: "text-muted-foreground",
			primary: "text-primary",
			secondary: "text-secondary",
			success: "text-green-500",
			warning: "text-yellow-500",
			danger: "text-destructive",
		},
		variant: {
			default: "animate-spin",
			gradient: "animate-spin",
			wave: "",
			dots: "",
			spinner: "",
		},
	},
	defaultVariants: {
		size: "md",
		color: "primary",
		variant: "dots",
	},
});

export type AvatarProps = VariantProps<typeof avatarVariants>;
export type SpinnerProps = VariantProps<typeof spinnerVariants>;
