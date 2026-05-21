type Variant =
	| "default"
	| "primary"
	| "secondary"
	| "success"
	| "warning"
	| "error"
	| "info"
	| "outline"

interface BadgeProps {
	children: React.ReactNode
	variant?: Variant
	size?: "sm" | "md"
	dot?: boolean
}

/**
 * Tonal pills using brand-adjacent semantic tokens, not raw Tailwind hues.
 * The dot variant is for status indicators in tables and lists; the bigger
 * `md` size is for prominent status labels (sized so icon + label both
 * read distinctly — single-pill scan should not require a second glance).
 */
const variants: Record<Variant, { surface: string; dot: string }> = {
	default: {
		surface:
			"bg-[hsl(var(--surface-muted))] text-[hsl(var(--foreground-muted))] ring-1 ring-inset ring-[hsl(var(--border))]",
		dot: "bg-[hsl(var(--foreground-subtle))]",
	},
	primary: {
		surface:
			"bg-[hsl(var(--primary-soft))] text-[hsl(var(--accent-foreground))] ring-1 ring-inset ring-[hsl(var(--primary)/0.2)]",
		dot: "bg-primary",
	},
	secondary: {
		surface:
			"bg-[hsl(var(--secondary-soft))] text-[hsl(var(--secondary-strong))] ring-1 ring-inset ring-[hsl(var(--secondary)/0.3)]",
		dot: "bg-secondary",
	},
	success: {
		surface:
			"bg-[hsl(var(--success-soft))] text-[hsl(var(--success-foreground))] ring-1 ring-inset ring-[hsl(var(--success)/0.25)]",
		dot: "bg-[hsl(var(--success))]",
	},
	warning: {
		surface:
			"bg-[hsl(var(--warning-soft))] text-[hsl(var(--warning-foreground))] ring-1 ring-inset ring-[hsl(var(--warning)/0.3)]",
		dot: "bg-[hsl(var(--warning))]",
	},
	error: {
		surface:
			"bg-[hsl(var(--danger-soft))] text-[hsl(var(--danger-foreground))] ring-1 ring-inset ring-[hsl(var(--danger)/0.25)]",
		dot: "bg-[hsl(var(--danger))]",
	},
	info: {
		surface:
			"bg-[hsl(var(--info-soft))] text-[hsl(var(--info-foreground))] ring-1 ring-inset ring-[hsl(var(--info)/0.25)]",
		dot: "bg-[hsl(var(--info))]",
	},
	outline: {
		surface:
			"bg-transparent text-[hsl(var(--foreground-muted))] ring-1 ring-inset ring-[hsl(var(--border-strong))]",
		dot: "bg-[hsl(var(--foreground-subtle))]",
	},
}

export default function Badge({
	children,
	variant = "default",
	size = "sm",
	dot = false,
}: BadgeProps) {
	const sizes = {
		sm: "px-2 py-0.5 text-[11px] gap-1",
		md: "px-3 py-1 text-[13px] gap-1.5",
	}
	const cfg = variants[variant]
	return (
		<span
			className={`inline-flex items-center font-medium rounded-full ${cfg.surface} ${sizes[size]}`}
		>
			{dot && (
				<span
					className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`}
					aria-hidden
				/>
			)}
			{children}
		</span>
	)
}
