import { ButtonHTMLAttributes, forwardRef } from "react"
import { Loader2 } from "lucide-react"

type Variant =
	| "primary"
	| "secondary"
	| "secondaryBrand"
	| "outline"
	| "soft"
	| "danger"
	| "ghost"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: Variant
	size?: "sm" | "md" | "lg"
	isLoading?: boolean
	leftIcon?: React.ReactNode
	rightIcon?: React.ReactNode
}

/**
 * Button — tonal variants drive from the brand palette + semantic tokens.
 * Gold (secondaryBrand) is reserved for premium/featured CTAs — never as a
 * generic fill. Loading state replaces both icons with a spinner.
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			children,
			variant = "primary",
			size = "md",
			isLoading = false,
			leftIcon,
			rightIcon,
			className = "",
			disabled,
			...props
		},
		ref,
	) => {
		const baseStyles =
			"relative inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:translate-y-px select-none"

		const variants: Record<Variant, string> = {
			primary:
				"bg-primary text-white shadow-soft hover:bg-[hsl(var(--primary)/0.92)] hover:shadow-raise focus-visible:ring-primary",
			secondary:
				"bg-white text-foreground border border-[hsl(var(--border-strong))] shadow-soft hover:bg-surface-muted hover:border-[hsl(var(--border-strong))] focus-visible:ring-[hsl(var(--border-strong))]",
			secondaryBrand:
				"bg-secondary text-white shadow-soft hover:bg-[hsl(var(--secondary)/0.92)] hover:shadow-raise focus-visible:ring-secondary",
			outline:
				"bg-transparent text-primary border border-[hsl(var(--primary)/0.3)] hover:bg-[hsl(var(--primary)/0.06)] hover:border-[hsl(var(--primary)/0.6)] focus-visible:ring-primary",
			soft:
				"bg-accent text-[hsl(var(--accent-foreground))] hover:bg-[hsl(var(--accent)/0.7)] focus-visible:ring-[hsl(var(--primary)/0.6)]",
			danger:
				"bg-[hsl(var(--danger))] text-white shadow-soft hover:bg-[hsl(var(--danger-foreground))] hover:shadow-raise focus-visible:ring-[hsl(var(--danger))]",
			ghost:
				"bg-transparent text-foreground hover:bg-surface-muted hover:text-foreground focus-visible:ring-[hsl(var(--border-strong))]",
		}

		const sizes = {
			sm: "px-3 py-1.5 text-xs",
			md: "px-4 py-2 text-sm",
			lg: "px-6 py-2.5 text-base",
		}

		return (
			<button
				ref={ref}
				className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className} cursor-pointer`}
				disabled={isLoading || disabled}
				{...props}
			>
				{isLoading && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.6} />}
				{!isLoading && leftIcon}
				{children}
				{!isLoading && rightIcon}
			</button>
		)
	},
)

Button.displayName = "Button"

export default Button
