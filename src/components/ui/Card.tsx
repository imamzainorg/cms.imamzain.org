import { ReactNode } from "react"

type Variant = "default" | "interactive" | "elevated" | "soft"
type Padding = "none" | "sm" | "md" | "lg"

interface CardProps {
	children: ReactNode
	className?: string
	title?: string
	subtitle?: string
	action?: ReactNode
	variant?: Variant
	padding?: Padding
}

const variantStyles: Record<Variant, string> = {
	default: "bg-white border border-[hsl(var(--border))] shadow-soft",
	interactive:
		"bg-white border border-[hsl(var(--border))] shadow-soft hover:shadow-raise hover:border-[hsl(var(--primary)/0.25)] hover:-translate-y-px transition-all duration-200",
	elevated: "bg-white border border-[hsl(var(--border))] shadow-raise",
	soft:
		"bg-linear-to-bl from-[hsl(var(--primary)/0.04)] via-white to-[hsl(var(--secondary)/0.04)] border border-[hsl(var(--primary)/0.15)]",
}

const paddingStyles: Record<Padding, string> = {
	none: "",
	sm: "p-4",
	md: "p-6",
	lg: "p-8",
}

export default function Card({
	children,
	className = "",
	title,
	subtitle,
	action,
	variant = "default",
	padding = "md",
}: CardProps) {
	const hasHeader = !!(title || action)
	return (
		<div className={`rounded-lg overflow-hidden ${variantStyles[variant]} ${className}`}>
			{hasHeader && (
				<div className="px-6 py-4 border-b border-[hsl(var(--border))] flex items-center justify-between gap-3">
					<div className="min-w-0 flex items-center gap-2">
						<div className="h-5 w-0.5 rounded-full bg-linear-to-b from-primary to-[hsl(var(--primary)/0.4)]" />
						<div className="min-w-0">
							{title && (
								<h3 className="text-base font-semibold text-foreground truncate">
									{title}
								</h3>
							)}
							{subtitle && (
								<p className="text-xs text-[hsl(var(--foreground-muted))] mt-0.5">{subtitle}</p>
							)}
						</div>
					</div>
					{action && <div className="shrink-0">{action}</div>}
				</div>
			)}
			<div className={paddingStyles[padding]}>{children}</div>
		</div>
	)
}
