import type { LucideIcon } from "lucide-react"
import { Inbox } from "lucide-react"

type Props = {
	icon?: LucideIcon
	title: string
	description?: string
	action?: React.ReactNode
	secondaryAction?: React.ReactNode
	/** "card" wraps in white panel; "bare" renders inline (for use inside Card) */
	variant?: "card" | "bare"
	className?: string
}

export default function EmptyState({
	icon: Icon = Inbox,
	title,
	description,
	action,
	secondaryAction,
	variant = "bare",
	className = "",
}: Props) {
	const content = (
		<div className={`text-center py-12 px-6 ${className}`}>
			<div className="mx-auto w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
				<Icon className="h-8 w-8 text-primary/60" />
			</div>
			<h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
			{description && (
				<p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">{description}</p>
			)}
			{(action || secondaryAction) && (
				<div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
					{action}
					{secondaryAction}
				</div>
			)}
		</div>
	)

	if (variant === "card") {
		return <div className="bg-white rounded-xl border border-gray-200">{content}</div>
	}

	return content
}
