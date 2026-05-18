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
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[hsl(169_30%_8%/0.55)] backdrop-blur-sm animate-fade-in"
			onClick={closeOnBackdrop ? onClose : undefined}
			role="dialog"
			aria-modal="true"
			aria-labelledby={title ? "modal-title" : undefined}
		>
			<div
				className={`bg-white rounded-2xl w-full ${sizeMap[size]} max-h-[90vh] flex flex-col shadow-pop ring-1 ring-black/5 animate-scale-in`}
				onClick={(e) => e.stopPropagation()}
			>
				{(title || !hideCloseButton) && (
					<div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
						<div className="flex-1 min-w-0">
							{title && (
								<h2
									id="modal-title"
									className="text-lg font-semibold text-gray-900"
								>
									{title}
								</h2>
							)}
							{description && (
								<p className="mt-1 text-sm text-gray-500 leading-relaxed">
									{description}
								</p>
							)}
						</div>
						{!hideCloseButton && (
							<button
								onClick={onClose}
								className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer ms-3 shrink-0 transition-colors"
								aria-label="إغلاق"
							>
								<X className="h-5 w-5" />
							</button>
						)}
					</div>
				)}

				<div className="flex-1 overflow-y-auto">{children}</div>

				{footer && (
					<div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-gray-100 bg-gray-50/60">
						{footer}
					</div>
				)}
			</div>
		</div>
	)
}
