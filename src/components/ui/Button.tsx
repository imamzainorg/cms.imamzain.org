import { ButtonHTMLAttributes, forwardRef } from "react"
import { Loader2 } from "lucide-react"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "primary" | "secondary" | "danger" | "ghost"
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
		ref
	) => {
		const baseStyles =
			"inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"

		const variants = {
			primary: "bg-primary text-white hover:bg-primary/90 focus:ring-primary",
			secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-500",
			danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
			ghost: "bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500",
		}

		const sizes = {
			sm: "px-3 py-1.5 text-sm",
			md: "px-4 py-2 text-sm",
			lg: "px-6 py-3 text-base",
		}

		return (
			<button
				ref={ref}
				className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
				disabled={isLoading || disabled}
				{...props}
			>
				{isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
				{!isLoading && leftIcon}
				{children}
				{!isLoading && rightIcon}
			</button>
		)
	}
)

Button.displayName = "Button"

export default Button
