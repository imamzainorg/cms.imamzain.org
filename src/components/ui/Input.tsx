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
					<label className="block text-sm font-medium text-gray-700 mb-1">
						{label}
						{props.required && <span className="text-red-500 ml-1">*</span>}
					</label>
				)}
				<div className="relative">
					{leftIcon && (
						<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
							{leftIcon}
						</div>
					)}
					<input
						ref={ref}
						className={`
							block w-full rounded-lg border shadow-sm
							focus:ring-2 focus:ring-primary focus:border-primary
							disabled:bg-gray-50 disabled:text-gray-500
							${leftIcon ? "pl-10" : "pl-3"}
							${error ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-gray-300"}
							py-2 pr-3
							${className}
						`}
						{...props}
					/>
				</div>
				{error && <p className="mt-1 text-sm text-red-600">{error}</p>}
				{helpText && !error && <p className="mt-1 text-sm text-gray-500">{helpText}</p>}
			</div>
		)
	}
)

Input.displayName = "Input"

export default Input
