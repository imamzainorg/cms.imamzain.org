"use client"

import { useEffect, useState } from "react"
import { Loader2, Search, X } from "lucide-react"
import { pickTranslation } from "@/lib/i18n"
import { SEARCH_MIN_LENGTH } from "@/lib/use-list-page"
import { useBook, useBooksList } from "@/lib/queries/books"
import type { Book } from "@/types"

type Props = {
	/** The chosen series parent's id, or null when the book is not a volume. */
	value: string | null
	onChange: (id: string | null) => void
	/** A book can't be its own parent. */
	excludeId?: string
}

const titleOf = (b: Pick<Book, "book_translations" | "translation">) =>
	pickTranslation(b.book_translations, b.translation)?.title || "بدون عنوان"

/**
 * Chooses the series a book is a volume of. Any TOP-LEVEL book can be a series
 * parent — a series starts life as an ordinary book (title, author, category,
 * cover; no PDF) that volumes are then attached to — so the candidates are the
 * normal book list, searched by title on the server (≥ 2 characters).
 *
 * The API refuses a parent that is itself a volume or that has no matching
 * live record, and a book that already has volumes can't be given a parent;
 * the list never offers volumes, and the form hides this picker for series
 * parents, so those 400s are only reachable by a stale page.
 */
export default function ParentBookPicker({ value, onChange, excludeId }: Props) {
	const [search, setSearch] = useState("")
	const [debounced, setDebounced] = useState("")
	useEffect(() => {
		const t = setTimeout(() => {
			const s = search.trim()
			setDebounced(s.length >= SEARCH_MIN_LENGTH ? s : "")
		}, 300)
		return () => clearTimeout(t)
	}, [search])

	const chosen = useBook(value ?? undefined)
	const results = useBooksList({ search: debounced || undefined, limit: 8 }, { enabled: !!debounced && !value })
	const candidates = (results.data?.items ?? []).filter((b) => b.id !== excludeId)

	if (value) {
		return (
			<div className="flex items-center justify-between gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-md text-sm">
				<span className="truncate">
					{chosen.isLoading ? <Loader2 className="h-4 w-4 animate-spin inline" /> : chosen.data ? titleOf(chosen.data) : "السلسلة المحددة"}
				</span>
				<button
					type="button"
					onClick={() => onChange(null)}
					className="cursor-pointer shrink-0 inline-flex items-center gap-1 text-xs text-gray-600 hover:text-red-600"
				>
					<X className="h-3.5 w-3.5" />إزالة
				</button>
			</div>
		)
	}

	return (
		<div>
			<div className="relative">
				<Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
				<input
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					maxLength={200}
					placeholder="ابحث عن عنوان السلسلة (حرفان على الأقل)…"
					className="w-full pr-9 pl-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
				/>
			</div>
			{debounced && (
				<ul className="mt-1 border border-gray-200 rounded-md divide-y divide-gray-100 bg-white max-h-56 overflow-y-auto">
					{results.isFetching && candidates.length === 0 ? (
						<li className="px-3 py-2 text-xs text-gray-500"><Loader2 className="h-3.5 w-3.5 animate-spin inline ml-1" />جارٍ البحث…</li>
					) : candidates.length === 0 ? (
						<li className="px-3 py-2 text-xs text-gray-500">لا توجد كتب بهذا العنوان.</li>
					) : (
						candidates.map((b) => (
							<li key={b.id}>
								<button
									type="button"
									onClick={() => { onChange(b.id); setSearch("") }}
									className="cursor-pointer w-full text-right px-3 py-2 text-sm hover:bg-primary/5"
								>
									{titleOf(b)}
									{(b.parts_count ?? 0) > 0 && <span className="mr-2 text-[11px] text-primary">سلسلة · {b.parts_count} أجزاء</span>}
								</button>
							</li>
						))
					)}
				</ul>
			)}
		</div>
	)
}
