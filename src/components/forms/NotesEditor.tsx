"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"

const MAX_NOTES_LENGTH = 2000

/**
 * Inline editor for the admin-only `notes` field on contacts / proxy-visits.
 * Saves independently of the status control — PATCHes `{ notes }` alone, with
 * no status key, so the API fires no side effects (no stamping, no WhatsApp
 * send). "" clears the note; the save button only appears once the draft
 * actually differs from the saved value.
 */
export default function NotesEditor({
	value,
	onSave,
	saving = false,
	label = "ملاحظة داخلية",
}: {
	value: string | null | undefined
	onSave: (notes: string) => void
	saving?: boolean
	label?: string
}) {
	const normalized = value ?? ""
	const [draft, setDraft] = useState(normalized)
	// Resync the draft when the saved value changes underneath us (a fresh
	// selection, or the server echoing back a save) — done during render per
	// https://react.dev/learn/you-might-not-need-an-effect, not in an effect.
	const [prevValue, setPrevValue] = useState(normalized)
	if (normalized !== prevValue) {
		setPrevValue(normalized)
		setDraft(normalized)
	}

	const dirty = draft !== normalized

	const save = () => {
		if (saving || !dirty) return
		onSave(draft)
	}

	return (
		<div>
			<label className="text-sm font-medium text-gray-500">{label}</label>
			<textarea
				value={draft}
				onChange={(e) => setDraft(e.target.value.slice(0, MAX_NOTES_LENGTH))}
				onBlur={save}
				maxLength={MAX_NOTES_LENGTH}
				rows={3}
				disabled={saving}
				placeholder="ملاحظة داخلية — لا تظهر للزوار..."
				className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-primary focus:border-primary resize-none disabled:opacity-60"
			/>
			<div className="mt-1 flex items-center justify-between">
				<span className={`text-xs ${draft.length >= MAX_NOTES_LENGTH ? "text-amber-600" : "text-gray-400"}`}>
					{draft.length} / {MAX_NOTES_LENGTH}
				</span>
				{saving ? (
					<span className="text-xs text-gray-400 inline-flex items-center gap-1">
						<Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.6} />جارٍ الحفظ...
					</span>
				) : dirty ? (
					<button
						type="button"
						onMouseDown={(e) => e.preventDefault()}
						onClick={save}
						className="cursor-pointer text-xs text-primary hover:underline"
					>
						حفظ الملاحظة
					</button>
				) : null}
			</div>
		</div>
	)
}
