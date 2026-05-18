"use client"

import { useState, useCallback, useRef, type ReactNode } from "react"
import { AlertTriangle, Trash2, Info, CheckCircle2 } from "lucide-react"
import Modal from "./Modal"
import Button from "./Button"

type Tone = "danger" | "warning" | "info" | "success"

const toneConfig: Record<Tone, { icon: typeof AlertTriangle; iconBg: string; iconColor: string; buttonVariant: "danger" | "primary" }> = {
	danger: { icon: Trash2, iconBg: "bg-red-50", iconColor: "text-red-600", buttonVariant: "danger" },
	warning: { icon: AlertTriangle, iconBg: "bg-amber-50", iconColor: "text-amber-600", buttonVariant: "primary" },
	info: { icon: Info, iconBg: "bg-blue-50", iconColor: "text-blue-600", buttonVariant: "primary" },
	success: { icon: CheckCircle2, iconBg: "bg-emerald-50", iconColor: "text-emerald-600", buttonVariant: "primary" },
}

type ConfirmOptions = {
	title: string
	description?: ReactNode
	confirmText?: string
	cancelText?: string
	tone?: Tone
}

type Props = ConfirmOptions & {
	open: boolean
	onConfirm: () => void | Promise<void>
	onCancel: () => void
	loading?: boolean
}

export default function ConfirmDialog({
	open,
	onConfirm,
	onCancel,
	title,
	description,
	confirmText = "تأكيد",
	cancelText = "إلغاء",
	tone = "danger",
	loading = false,
}: Props) {
	const cfg = toneConfig[tone]
	const Icon = cfg.icon

	return (
		<Modal open={open} onClose={loading ? () => {} : onCancel} size="sm" hideCloseButton>
			<div className="px-6 py-6">
				<div className="flex items-start gap-4">
					<div className={`shrink-0 w-12 h-12 rounded-full ${cfg.iconBg} flex items-center justify-center`}>
						<Icon className={`h-6 w-6 ${cfg.iconColor}`} />
					</div>
					<div className="flex-1 min-w-0">
						<h3 className="text-base font-semibold text-gray-900">{title}</h3>
						{description && (
							<div className="mt-2 text-sm text-gray-600 leading-relaxed">{description}</div>
						)}
					</div>
				</div>
				<div className="mt-6 flex items-center justify-end gap-2">
					<Button variant="ghost" onClick={onCancel} disabled={loading}>
						{cancelText}
					</Button>
					<Button variant={cfg.buttonVariant} onClick={onConfirm} isLoading={loading}>
						{confirmText}
					</Button>
				</div>
			</div>
		</Modal>
	)
}

type ConfirmState = ConfirmOptions & {
	open: boolean
	resolver: ((value: boolean) => void) | null
}

const initialState: ConfirmState = {
	open: false,
	title: "",
	resolver: null,
}

/**
 * Imperative confirm hook. Call `confirm({ title, description, ... })` from any handler;
 * returns a Promise<boolean>. Render `<dialog />` once anywhere inside the component tree.
 *
 * Example:
 *   const { confirm, dialog } = useConfirm()
 *   const ok = await confirm({ title: "حذف؟", description: "..." })
 *   if (ok) { ...delete... }
 *   return (<>...{dialog}</>)
 */
export function useConfirm() {
	const [state, setState] = useState<ConfirmState>(initialState)
	const [loading, setLoading] = useState(false)
	const stateRef = useRef(state)
	stateRef.current = state

	const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
		return new Promise((resolve) => {
			setState({ ...opts, open: true, resolver: resolve })
		})
	}, [])

	const close = useCallback((value: boolean) => {
		stateRef.current.resolver?.(value)
		setState((s) => ({ ...s, open: false, resolver: null }))
		setLoading(false)
	}, [])

	const dialog = (
		<ConfirmDialog
			open={state.open}
			title={state.title}
			description={state.description}
			confirmText={state.confirmText}
			cancelText={state.cancelText}
			tone={state.tone}
			loading={loading}
			onCancel={() => close(false)}
			onConfirm={() => close(true)}
		/>
	)

	return { confirm, dialog, setLoading }
}
