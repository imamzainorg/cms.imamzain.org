"use client"

import { useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { formatArNumber, toArabicDigits } from "@/lib/dates"

type Props = {
	page: number
	pages: number
	total: number
	limit: number
	pageSizes?: number[]
	onPage: (n: number) => void
	onLimit?: (n: number) => void
}

/**
 * Shared paginator with "showing X–Y of Z" label and an optional page-size selector.
 * Used across all list pages so users can browse 50/100 items per page instead of 20.
 *
 * Padding parity with `Button` size="sm" (px-3 py-1.5 gap-2) is intentional —
 * this control shows up on every list page and needs to read as part of the
 * button system, not an ad-hoc inline thing.
 */
export default function Pagination({
	page,
	pages,
	total,
	limit,
	pageSizes = [20, 50, 100],
	onPage,
	onLimit,
}: Props) {
	// Clamp an out-of-range page back into bounds. Without this, deleting /
	// restoring the last row on the last page leaves `page` pointing past the
	// (now smaller) page count, so the list refetches an empty page and looks
	// deceptively "empty". Runs before the total===0 early-return so the Rules
	// of Hooks hold.
	useEffect(() => {
		if (total > 0 && pages >= 1 && page > pages) onPage(pages)
	}, [page, pages, total, onPage])

	if (total === 0) return null
	const fromIdx = (page - 1) * limit + 1
	const toIdx = Math.min(page * limit, total)

	return (
		<div className="mt-6 flex justify-between items-center text-sm text-[hsl(var(--foreground-muted))] flex-wrap gap-3">
			<div className="flex items-center gap-3">
				<span className="arabic-nums">
					عرض{" "}
					<span className="font-semibold text-foreground tabular-nums">
						{toArabicDigits(fromIdx)}–{toArabicDigits(toIdx)}
					</span>{" "}
					من{" "}
					<span className="font-semibold text-foreground tabular-nums">
						{formatArNumber(total)}
					</span>
				</span>
				{onLimit && (
					<select
						value={limit}
						onChange={(e) => onLimit(Number(e.target.value))}
						className="cursor-pointer text-xs border border-[hsl(var(--border))] rounded-md px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
					>
						{pageSizes.map((s) => (
							<option key={s} value={s}>
								{s} / صفحة
							</option>
						))}
					</select>
				)}
			</div>
			<div className="flex items-center gap-2">
				<span className="text-xs text-[hsl(var(--foreground-subtle))] arabic-nums">
					صفحة {toArabicDigits(page)} من {toArabicDigits(pages || 1)}
				</span>
				<button
					onClick={() => onPage(page - 1)}
					disabled={page === 1}
					className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-foreground bg-white border border-[hsl(var(--border-strong))] rounded-md shadow-soft hover:bg-surface-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					<ChevronRight className="h-3.5 w-3.5" strokeWidth={1.6} />السابق
				</button>
				<button
					onClick={() => onPage(page + 1)}
					disabled={page >= pages}
					className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-foreground bg-white border border-[hsl(var(--border-strong))] rounded-md shadow-soft hover:bg-surface-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					التالي<ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.6} />
				</button>
			</div>
		</div>
	)
}
