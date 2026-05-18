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
	default: "bg-white border border-gray-200 shadow-soft",
	interactive:
		"bg-white border border-gray-200 shadow-soft hover:shadow-raise hover:border-primary/30 transition-all duration-200",
	elevated: "bg-white border border-gray-100 shadow-raise",
	soft:
		"bg-linear-to-bl from-primary/[0.04] via-white to-secondary/[0.04] border border-primary/15",
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
		<div className={`rounded-xl overflow-hidden ${variantStyles[variant]} ${className}`}>
			{hasHeader && (
				<div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
					<div className="min-w-0">
						{title && (
							<h3 className="text-base font-semibold text-gray-900 truncate">
								{title}
							</h3>
						)}
						{subtitle && (
							<p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
						)}
					</div>
					{action && <div className="shrink-0">{action}</div>}
				</div>
			)}
			<div className={paddingStyles[padding]}>{children}</div>
		</div>
	)
}
