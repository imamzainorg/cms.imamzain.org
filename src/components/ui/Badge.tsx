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

const variants: Record<Variant, { surface: string; dot: string }> = {
	default: {
		surface: "bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-200",
		dot: "bg-gray-400",
	},
	primary: {
		surface: "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20",
		dot: "bg-primary",
	},
	secondary: {
		surface:
			"bg-secondary/15 text-[hsl(35_55%_30%)] ring-1 ring-inset ring-secondary/30",
		dot: "bg-secondary",
	},
	success: {
		surface:
			"bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
		dot: "bg-emerald-500",
	},
	warning: {
		surface: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200",
		dot: "bg-amber-500",
	},
	error: {
		surface: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
		dot: "bg-red-500",
	},
	info: {
		surface: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
		dot: "bg-blue-500",
	},
	outline: {
		surface: "bg-transparent text-gray-700 ring-1 ring-inset ring-gray-300",
		dot: "bg-gray-400",
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
		md: "px-2.5 py-1 text-xs gap-1.5",
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
