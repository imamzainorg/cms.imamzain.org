import { ReactNode } from "react"

interface CardProps {
	children: ReactNode
	className?: string
	title?: string
	subtitle?: string
	action?: ReactNode
}

export default function Card({
	children,
	className = "",
	title,
	subtitle,
	action,
}: CardProps) {
	return (
		<div className={`bg-white shadow-sm rounded-lg border border-gray-200 ${className}`}>
			{(title || action) && (
				<div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
					<div>
						{title && <h3 className="text-lg font-medium text-gray-900">{title}</h3>}
						{subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
					</div>
					{action && <div>{action}</div>}
				</div>
			)}
			<div className={title || action ? "p-6" : "p-6"}>{children}</div>
		</div>
	)
}
