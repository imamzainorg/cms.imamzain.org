"use client"

/**
 * Skeleton primitives. Replace inline spinners on list pages so the page
 * "shape" appears immediately on first paint — the user sees the layout
 * collapsing into real data instead of staring at a centred Loader2.
 *
 * The animation uses Tailwind's built-in `animate-pulse`; the base color is
 * `bg-gray-200` so it blends with our gray-200 borders and white surfaces.
 */

import type { HTMLAttributes } from "react"

export function Skeleton({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-live="polite"
			className={`shimmer rounded-md ${className}`}
			{...rest}
		/>
	)
}

/**
 * `<TableSkeleton rows={5} cols={5} />` — renders inside a `<tbody>` to keep
 * the existing table's column widths. Pass `cellHeights` for non-uniform rows.
 */
export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
	return (
		<>
			{Array.from({ length: rows }).map((_, r) => (
				<tr key={r}>
					{Array.from({ length: cols }).map((_, c) => (
						<td key={c} className="px-6 py-4">
							<Skeleton className="h-4 w-full max-w-32" />
						</td>
					))}
				</tr>
			))}
		</>
	)
}

/**
 * Vertically stacked rows for inbox/feed-style lists (contacts, audit logs).
 */
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
	return (
		<div className="divide-y divide-gray-100">
			{Array.from({ length: rows }).map((_, i) => (
				<div key={i} className="px-5 py-4 flex items-start gap-3">
					<Skeleton className="h-9 w-9 rounded-full shrink-0" />
					<div className="flex-1 space-y-2">
						<Skeleton className="h-3.5 w-2/3" />
						<Skeleton className="h-3 w-1/2" />
					</div>
					<Skeleton className="h-3 w-12 shrink-0" />
				</div>
			))}
		</div>
	)
}

/**
 * Grid of card placeholders for media / gallery / books / papers.
 * `aspect` defaults to "aspect-square"; pass "aspect-[3/4]" for portrait covers.
 */
export function CardGridSkeleton({
	count = 12,
	aspect = "aspect-square",
	cols = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
}: {
	count?: number
	aspect?: string
	cols?: string
}) {
	return (
		<div className={`grid gap-3 ${cols}`}>
			{Array.from({ length: count }).map((_, i) => (
				<div key={i} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
					<Skeleton className={`${aspect} w-full rounded-none`} />
					<div className="p-2 space-y-1.5">
						<Skeleton className="h-3 w-3/4" />
						<Skeleton className="h-2.5 w-1/2" />
					</div>
				</div>
			))}
		</div>
	)
}

/**
 * Generic "form/detail loading" skeleton used by stat dashboards and
 * single-record pages while the data resolves.
 */
export function StatGridSkeleton({ count = 4 }: { count?: number }) {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			{Array.from({ length: count }).map((_, i) => (
				<div key={i} className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
					<Skeleton className="h-3 w-20" />
					<Skeleton className="h-7 w-24" />
					<Skeleton className="h-2.5 w-32" />
				</div>
			))}
		</div>
	)
}

