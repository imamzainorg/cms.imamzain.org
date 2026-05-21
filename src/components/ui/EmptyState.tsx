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

/**
 * EmptyState — a quiet, branded panel. The icon sits in a soft emerald
 * disc inside a faint geometric-ornament background, signaling
 * institutional context without shouting.
 */
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
		<div className={`relative overflow-hidden text-center py-14 px-6 ${className}`}>
			<div
				className="absolute inset-0 ornament-tile pointer-events-none"
				style={{ opacity: 0.04 }}
				aria-hidden
			/>
			<div className="relative">
				<div className="mx-auto w-16 h-16 rounded-full bg-[hsl(var(--primary)/0.06)] flex items-center justify-center mb-4 ring-1 ring-[hsl(var(--primary)/0.12)]">
					<Icon className="h-7 w-7 text-primary/70" strokeWidth={1.4} />
				</div>
				<h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
				{description && (
					<p className="text-sm text-[hsl(var(--foreground-muted))] max-w-sm mx-auto leading-relaxed">{description}</p>
				)}
				{(action || secondaryAction) && (
					<div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
						{action}
						{secondaryAction}
					</div>
				)}
			</div>
		</div>
	)

	if (variant === "card") {
		return <div className="bg-white rounded-lg border border-[hsl(var(--border))] shadow-soft">{content}</div>
	}

	return content
}
