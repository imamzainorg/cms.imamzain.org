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
				"bg-primary text-white shadow-soft hover:bg-primary/92 hover:shadow-raise focus-visible:ring-primary",
			secondary:
				"bg-white text-gray-700 border border-gray-300 shadow-soft hover:bg-gray-50 hover:border-gray-400 focus-visible:ring-gray-400",
			secondaryBrand:
				"bg-secondary text-white shadow-soft hover:bg-secondary/92 hover:shadow-raise focus-visible:ring-secondary",
			outline:
				"bg-transparent text-primary border border-primary/30 hover:bg-primary/5 hover:border-primary/60 focus-visible:ring-primary",
			soft:
				"bg-primary/10 text-primary hover:bg-primary/15 focus-visible:ring-primary/60",
			danger:
				"bg-red-600 text-white shadow-soft hover:bg-red-700 hover:shadow-raise focus-visible:ring-red-500",
			ghost:
				"bg-transparent text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-400",
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
				{isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
				{!isLoading && leftIcon}
				{children}
				{!isLoading && rightIcon}
			</button>
		)
	},
)

Button.displayName = "Button"

export default Button
