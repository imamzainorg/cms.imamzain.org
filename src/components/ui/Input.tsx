import { InputHTMLAttributes, forwardRef } from "react"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
	label?: string
	error?: string
	helpText?: string
	leftIcon?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
	({ label, error, helpText, leftIcon, className = "", ...props }, ref) => {
		return (
			<div className="w-full">
				{label && (
					<label className="block text-sm font-medium text-foreground mb-1">
						{label}
						{props.required && <span className="text-[hsl(var(--danger))] ms-1">*</span>}
					</label>
				)}
				<div className="relative group">
					{leftIcon && (
						<div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-[hsl(var(--foreground-subtle))] group-focus-within:text-primary transition-colors">
							{leftIcon}
						</div>
					)}
					<input
						ref={ref}
						className={`
							block w-full rounded-md border bg-white shadow-soft
							placeholder:text-[hsl(var(--foreground-subtle))]
							transition-all duration-150
							hover:border-[hsl(var(--border-strong))]
							focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
							disabled:bg-surface-muted disabled:text-[hsl(var(--foreground-disabled))] disabled:cursor-not-allowed
							${leftIcon ? "ps-10" : "ps-3"}
							${error ? "border-[hsl(var(--danger)/0.5)] focus:ring-[hsl(var(--danger))/0.25] focus:border-[hsl(var(--danger))]" : "border-[hsl(var(--input))]"}
							py-1.5 pe-3 text-sm
							${className}
						`}
						{...props}
					/>
				</div>
				{error && <p className="mt-1.5 text-xs text-[hsl(var(--danger))] flex items-center gap-1">{error}</p>}
				{helpText && !error && <p className="mt-1.5 text-xs text-[hsl(var(--foreground-muted))]">{helpText}</p>}
			</div>
		)
	},
)

Input.displayName = "Input"

export default Input
