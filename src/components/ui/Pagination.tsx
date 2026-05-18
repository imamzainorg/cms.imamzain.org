"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

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
 */
export default function Pagination({
	page, pages, total, limit, pageSizes = [20, 50, 100], onPage, onLimit,
}: Props) {
	if (total === 0) return null
	const fromIdx = (page - 1) * limit + 1
	const toIdx = Math.min(page * limit, total)

	return (
		<div className="mt-6 flex justify-between items-center text-sm text-gray-600 flex-wrap gap-3">
			<div className="flex items-center gap-3">
				<span>
					عرض <span className="font-semibold text-gray-900">{fromIdx}–{toIdx}</span>{" "}
					من <span className="font-semibold text-gray-900">{total.toLocaleString("ar-EG")}</span>
				</span>
				{onLimit && (
					<select
						value={limit}
						onChange={(e) => onLimit(Number(e.target.value))}
						className="cursor-pointer text-xs border border-gray-300 rounded-md px-2 py-1 focus:ring-primary focus:border-primary"
					>
						{pageSizes.map((s) => <option key={s} value={s}>{s} / صفحة</option>)}
					</select>
				)}
			</div>
			<div className="flex items-center gap-2">
				<span className="text-xs text-gray-500">صفحة {page} من {pages || 1}</span>
				<button
					onClick={() => onPage(page - 1)}
					disabled={page === 1}
					className="cursor-pointer inline-flex items-center gap-1 px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
				>
					<ChevronRight className="h-4 w-4" />السابق
				</button>
				<button
					onClick={() => onPage(page + 1)}
					disabled={page >= pages}
					className="cursor-pointer inline-flex items-center gap-1 px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
				>
					التالي<ChevronLeft className="h-4 w-4" />
				</button>
			</div>
		</div>
	)
}
