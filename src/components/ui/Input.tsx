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
					<label className="block text-sm font-medium text-gray-700 mb-1.5">
						{label}
						{props.required && <span className="text-red-500 ms-1">*</span>}
					</label>
				)}
				<div className="relative group">
					{leftIcon && (
						<div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary transition-colors">
							{leftIcon}
						</div>
					)}
					<input
						ref={ref}
						className={`
							block w-full rounded-lg border bg-white shadow-soft
							placeholder:text-gray-400
							transition-all duration-150
							hover:border-gray-400
							focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
							disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
							${leftIcon ? "ps-10" : "ps-3"}
							${error ? "border-red-300 focus:ring-red-500/30 focus:border-red-500" : "border-gray-300"}
							py-2 pe-3 text-sm
							${className}
						`}
						{...props}
					/>
				</div>
				{error && <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">{error}</p>}
				{helpText && !error && <p className="mt-1.5 text-xs text-gray-500">{helpText}</p>}
			</div>
		)
	},
)

Input.displayName = "Input"

export default Input
