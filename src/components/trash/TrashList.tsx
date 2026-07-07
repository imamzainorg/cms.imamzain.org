"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { AxiosResponse } from "axios"
import {
	useMutation,
	useQuery,
	useQueryClient,
	keepPreviousData,
	type QueryKey,
} from "@tanstack/react-query"
import { ArrowRight, Loader2, RotateCcw, Trash2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api"
import { safeFormat } from "@/lib/dates"
import EmptyState from "@/components/ui/EmptyState"
import PageHeader from "@/components/layout/PageHeader"
import Pagination from "@/components/ui/Pagination"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import type { PaginatedResponse } from "@/types"
import { queryKeys } from "@/lib/queries/keys"

type Service<T> = {
	trash: (params?: { page?: number; limit?: number }) => Promise<AxiosResponse<PaginatedResponse<T>>>
	restore: (id: string) => Promise<AxiosResponse<T>>
}

type Props<T> = {
	title: string
	description?: string
	singular: string
	icon: LucideIcon
	backHref: string
	backLabel?: string
	resource: string
	/** Root query key to invalidate after restore (typically the resource's `.all`). */
	rootKey: QueryKey
	service: Service<T>
	/** Some resources are keyed by `media_id` rather than `id` — supply explicitly. */
	getId: (item: T) => string
	getLabel: (item: T) => string
	getSubtitle?: (item: T) => string | null | undefined
	getThumbnailUrl?: (item: T) => string | null | undefined
	getCreatedAt?: (item: T) => string | null | undefined
}

/**
 * Generic trash-list view used by every soft-deletable resource (posts, books,
 * papers, gallery, all 4 category types). Handles pagination, restore with
 * 409-aware error messages, and the standard "back to live list" link.
 */
export default function TrashList<T>({
	title, description, singular, icon, backHref, backLabel = "العودة",
	resource, rootKey, service,
	getId, getLabel, getSubtitle, getThumbnailUrl, getCreatedAt,
}: Props<T>) {
	const router = useRouter()
	const qc = useQueryClient()
	const { confirm, dialog } = useConfirm()
	const [page, setPage] = useState(1)
	const [limit, setLimit] = useState(20)

	const trashQuery = useQuery({
		queryKey: queryKeys.trash.resource(resource, { page, limit }),
		queryFn: async () => (await service.trash({ page, limit })).data,
		placeholderData: keepPreviousData,
	})
	const items = trashQuery.data?.items ?? []
	const total = trashQuery.data?.pagination.total ?? 0
	const pages = trashQuery.data?.pagination.pages ?? 1

	const restoreMutation = useMutation({
		mutationFn: (id: string) => service.restore(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: rootKey })
			qc.invalidateQueries({ queryKey: queryKeys.trash.all })
		},
	})

	const handleRestore = async (item: T) => {
		const label = getLabel(item) || singular
		const ok = await confirm({
			title: `استعادة "${label}"؟`,
			description: "ستعود إلى القائمة الرئيسية. إن كان الرابط المختصر / المُعرّف قد أُخذ من قبل عنصر آخر، يجب أن تعدّله أولاً.",
			confirmText: "استعادة",
			tone: "info",
		})
		if (!ok) return
		restoreMutation.mutate(getId(item), {
			onSuccess: () => toast.success("تمت الاستعادة"),
			onError: (e) => toast.error(getErrorMessage(e, "تعذّرت الاستعادة — قد يكون الرابط مأخوذاً")),
		})
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title={title}
				description={description}
				icon={icon}
				actions={
					<button
						onClick={() => router.push(backHref)}
						className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-foreground border border-[hsl(var(--border-strong))] rounded-md hover:bg-surface-muted shadow-soft transition-colors"
					>
						<ArrowRight className="h-4 w-4" strokeWidth={1.6} />
						{backLabel}
					</button>
				}
			/>

			{trashQuery.isLoading ? (
				<div className="bg-white rounded-xl border border-gray-200 flex items-center justify-center py-16">
					<Loader2 className="h-8 w-8 animate-spin text-primary" />
				</div>
			) : total === 0 ? (
				<EmptyState
					variant="card"
					icon={Trash2}
					title="سلة المهملات فارغة"
					description="العناصر المحذوفة تظهر هنا. يمكن استعادتها مع الحفاظ على التاريخ."
				/>
			) : items.length === 0 ? (
				// total > 0 but this page is empty (last row on the last page was
				// just restored) — Pagination clamps `page` back in range and the
				// query refetches; show a spinner rather than a false "empty" state.
				<div className="bg-white rounded-xl border border-gray-200 flex items-center justify-center py-16">
					<Loader2 className="h-8 w-8 animate-spin text-primary" />
				</div>
			) : (
				<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{singular}</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ الإنشاء</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">إجراءات</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-100">
							{items.map((item) => {
								const label = getLabel(item) || "—"
								const subtitle = getSubtitle?.(item)
								const thumb = getThumbnailUrl?.(item)
								const createdAt = getCreatedAt?.(item)
								return (
									<tr key={getId(item)} className="hover:bg-gray-50">
										<td className="px-6 py-4">
											<div className="flex items-center gap-3">
												{thumb !== undefined && (
													<div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
														{thumb
															? <img src={thumb} alt="" className="w-full h-full object-cover" />
															: <Trash2 className="h-5 w-5 text-gray-400" />}
													</div>
												)}
												<div className="min-w-0">
													<p className="text-sm font-medium text-gray-900 truncate">{label}</p>
													{subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
												</div>
											</div>
										</td>
										<td className="px-6 py-4 text-sm text-gray-500">
											{safeFormat(createdAt, "dd/MM/yyyy")}
										</td>
										<td className="px-6 py-4 text-left">
											<button
												onClick={() => handleRestore(item)}
												disabled={restoreMutation.isPending}
												className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-md shadow-soft hover:bg-[hsl(var(--primary)/0.92)] hover:shadow-raise disabled:opacity-50 transition-all"
											>
												<RotateCcw className="h-3.5 w-3.5" strokeWidth={1.6} />استعادة
											</button>
										</td>
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>
			)}

			<Pagination
				page={page} pages={pages} total={total} limit={limit}
				onPage={setPage}
				onLimit={(n) => { setLimit(n); setPage(1) }}
			/>
			{dialog}
		</div>
	)
}
