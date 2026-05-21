"use client"

import { useEffect } from "react"
import { X } from "lucide-react"

type Size = "sm" | "md" | "lg" | "xl" | "2xl"

const sizeMap: Record<Size, string> = {
	sm: "max-w-md",
	md: "max-w-lg",
	lg: "max-w-3xl",
	xl: "max-w-5xl",
	"2xl": "max-w-7xl",
}

type Props = {
	open: boolean
	onClose: () => void
	title?: string
	description?: string
	size?: Size
	closeOnBackdrop?: boolean
	hideCloseButton?: boolean
	children: React.ReactNode
	footer?: React.ReactNode
}

/**
 * Modal — centered, brand-tinted scrim, no backdrop blur (keeps focus on the
 * modal and preserves performance on long forms).
 */
export default function Modal({
	open,
	onClose,
	title,
	description,
	size = "md",
	closeOnBackdrop = true,
	hideCloseButton = false,
	children,
	footer,
}: Props) {
	useEffect(() => {
		if (!open) return
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose()
		}
		document.addEventListener("keydown", handler)
		const prev = document.body.style.overflow
		document.body.style.overflow = "hidden"
		return () => {
			document.removeEventListener("keydown", handler)
			document.body.style.overflow = prev
		}
	}, [open, onClose])

	if (!open) return null

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[hsl(var(--foreground)/0.5)] animate-fade-in"
			onClick={closeOnBackdrop ? onClose : undefined}
			role="dialog"
			aria-modal="true"
			aria-labelledby={title ? "modal-title" : undefined}
		>
			<div
				className={`bg-white rounded-xl w-full ${sizeMap[size]} max-h-[90vh] flex flex-col shadow-pop ring-1 ring-[hsl(var(--border))] animate-scale-in`}
				onClick={(e) => e.stopPropagation()}
			>
				{(title || !hideCloseButton) && (
					<div className="flex items-start justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
						<div className="flex-1 min-w-0">
							{title && (
								<h2
									id="modal-title"
									className="text-lg font-semibold text-foreground"
								>
									{title}
								</h2>
							)}
							{description && (
								<p className="mt-1 text-sm text-[hsl(var(--foreground-muted))] leading-relaxed">
									{description}
								</p>
							)}
						</div>
						{!hideCloseButton && (
							<button
								onClick={onClose}
								className="p-1.5 rounded-md text-[hsl(var(--foreground-subtle))] hover:text-foreground hover:bg-surface-muted cursor-pointer ms-3 shrink-0 transition-colors"
								aria-label="إغلاق"
							>
								<X className="h-5 w-5" strokeWidth={1.6} />
							</button>
						)}
					</div>
				)}

				<div className="flex-1 overflow-y-auto">{children}</div>

				{footer && (
					<div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-[hsl(var(--border))] bg-surface-muted/60">
						{footer}
					</div>
				)}
			</div>
		</div>
	)
}
