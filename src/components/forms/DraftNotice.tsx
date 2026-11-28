import { History } from "lucide-react"
import { safeFormat, toArabicDigits } from "@/lib/dates"

type Props = {
	draft: { enabled: boolean; restoredAt: string | null; discard: () => void }
}

/** Tells the editor a new form is being kept, and offers to throw a restored copy away. */
export default function DraftNotice({ draft }: Props) {
	if (!draft.enabled) return null
	if (!draft.restoredAt) {
		return <p className="col-span-full text-xs text-gray-500">تُحفظ المسودة تلقائياً على هذا الجهاز أثناء الكتابة.</p>
	}
	return (
		<div role="status" className="col-span-full flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
			<span className="flex items-center gap-2">
				<History className="h-4 w-4 shrink-0" strokeWidth={1.6} />
				استُرجعت مسودة محفوظة تلقائياً ({toArabicDigits(safeFormat(draft.restoredAt, "dd/MM/yyyy HH:mm"))}). لم تُحفظ في الموقع بعد.
			</span>
			<button type="button" onClick={draft.discard} className="cursor-pointer rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-amber-100">
				حذف المسودة والبدء من جديد
			</button>
		</div>
	)
}
