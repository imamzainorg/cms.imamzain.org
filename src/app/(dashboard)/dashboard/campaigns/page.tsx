"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { NewsletterCampaign, CampaignStatus } from "@/types"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api"
import { safeFormat } from "@/lib/dates"
import { Send, Plus, Mail, Trash2, Clock, Edit, Pause } from "lucide-react"
import EmptyState from "@/components/ui/EmptyState"
import PageHeader from "@/components/layout/PageHeader"
import Pagination from "@/components/ui/Pagination"
import FilterPills from "@/components/ui/FilterPills"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { ListSkeleton } from "@/components/ui/Skeleton"
import {
	useCampaignsList,
	useCancelCampaign,
	useDeleteCampaign,
} from "@/lib/queries/campaigns"
import { useListPage } from "@/lib/use-list-page"

const STATUS_LABEL: Record<CampaignStatus, string> = {
	draft: "مسودة",
	scheduled: "مجدولة",
	sending: "قيد الإرسال",
	sent: "أُرسلت",
	cancelled: "أُلغيت",
	failed: "فشلت",
}

const STATUS_BADGE: Record<CampaignStatus, string> = {
	draft: "bg-gray-100 text-gray-700",
	scheduled: "bg-blue-100 text-blue-800",
	sending: "bg-amber-100 text-amber-800",
	sent: "bg-green-100 text-green-800",
	cancelled: "bg-gray-200 text-gray-700",
	failed: "bg-red-100 text-red-800",
}

export default function CampaignsPage() {
	const router = useRouter()
	const { confirm, dialog: confirmDialog } = useConfirm()
	const { page, setPage, limit, setLimit, resetPageAndSelection } = useListPage({ initialLimit: 20 })
	const [statusFilter, setStatusFilter] = useState<CampaignStatus | "all">("all")

	const listQuery = useCampaignsList({
		page,
		limit,
		status: statusFilter === "all" ? undefined : statusFilter,
	})
	const items = listQuery.data?.items ?? []
	const total = listQuery.data?.pagination.total ?? 0
	const pages = listQuery.data?.pagination.pages ?? 1

	const cancelCampaign = useCancelCampaign()
	const deleteCampaign = useDeleteCampaign()

	const handleCancel = async (c: NewsletterCampaign) => {
		const ok = await confirm({
			title: "إلغاء الإرسال؟",
			description: c.status === "sending"
				? `الحملة قيد الإرسال (${c.delivered_count}/${c.recipient_count}). سيتوقف الإرسال للمشتركين المتبقّين.`
				: "ستتحوّل الحملة إلى حالة \"أُلغيت\".",
			confirmText: "إلغاء الإرسال",
			tone: "warning",
		})
		if (!ok) return
		cancelCampaign.mutate(c.id, {
			onSuccess: () => toast.success("تم الإلغاء"),
			onError: (e) => toast.error(getErrorMessage(e, "فشل الإلغاء")),
		})
	}

	const handleDelete = async (c: NewsletterCampaign) => {
		const ok = await confirm({
			title: "حذف الحملة نهائياً؟",
			description: "يُسمح بالحذف فقط للمسودّات والملغاة.",
			confirmText: "حذف",
			tone: "danger",
		})
		if (!ok) return
		deleteCampaign.mutate(c.id, {
			onSuccess: () => toast.success("تم الحذف"),
			onError: (e) => toast.error(getErrorMessage(e, "فشل الحذف")),
		})
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title="حملات النشرة البريدية"
				description="أنشئ حملة بريدية مجدولة أو فورية لكل المشتركين النشطين. الإرسال يتم على دفعات (50 لكل دقيقة)."
				icon={Send}
				actions={
					<button onClick={() => router.push("/dashboard/campaigns/new")} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90">
						<Plus className="h-4 w-4" />حملة جديدة
					</button>
				}
			/>

			<div className="bg-white rounded-xl border border-gray-200 p-3 overflow-x-auto">
				<FilterPills
					value={statusFilter}
					onChange={(v) => { setStatusFilter(v); resetPageAndSelection() }}
					variant="segmented"
					options={[
						{ value: "all", label: "الكل" },
						{ value: "draft", label: STATUS_LABEL.draft },
						{ value: "scheduled", label: STATUS_LABEL.scheduled },
						{ value: "sending", label: STATUS_LABEL.sending },
						{ value: "sent", label: STATUS_LABEL.sent },
						{ value: "cancelled", label: STATUS_LABEL.cancelled },
						{ value: "failed", label: STATUS_LABEL.failed },
					]}
				/>
			</div>

			{listQuery.isLoading ? (
				<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
					<ListSkeleton rows={4} />
				</div>
			) : items.length === 0 ? (
				<EmptyState
					variant="card"
					icon={Mail}
					title={statusFilter === "all" ? "لا توجد حملات بعد" : "لا توجد حملات بهذه الحالة"}
					description="أنشئ حملة جديدة وأرسلها لكل المشتركين النشطين."
					action={(
						<button onClick={() => router.push("/dashboard/campaigns/new")} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-md hover:bg-primary/90">
							<Plus className="h-4 w-4" />حملة جديدة
						</button>
					)}
				/>
			) : (
				<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الموضوع</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإيصال</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">إجراءات</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-100">
							{items.map((c) => {
								const pct = c.recipient_count > 0
									? Math.round((c.delivered_count / c.recipient_count) * 100)
									: 0
								return (
									<tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/dashboard/campaigns/${c.id}`)}>
										<td className="px-6 py-3">
											<p className="text-sm font-medium text-gray-900 truncate max-w-md">{c.subject}</p>
											{c.scheduled_at && c.status === "scheduled" && (
												<p className="text-xs text-gray-500 mt-0.5 inline-flex items-center gap-1">
													<Clock className="h-3 w-3" />
													{safeFormat(c.scheduled_at, "dd/MM/yyyy HH:mm")}
												</p>
											)}
										</td>
										<td className="px-6 py-3">
											<span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_BADGE[c.status]}`}>
												{STATUS_LABEL[c.status]}
											</span>
										</td>
										<td className="px-6 py-3 text-xs">
											{c.recipient_count > 0 ? (
												<div className="w-32">
													<div className="flex justify-between mb-1 text-gray-600">
														<span>{c.delivered_count}/{c.recipient_count}</span>
														<span>{pct}%</span>
													</div>
													<div className="w-full bg-gray-200 rounded-full h-1.5">
														<div className="bg-primary h-1.5 rounded-full" style={{ width: `${pct}%` }} />
													</div>
													{c.failed_count > 0 && (
														<p className="text-[10px] text-red-600 mt-0.5">{c.failed_count} فشل</p>
													)}
												</div>
											) : <span className="text-gray-400">—</span>}
										</td>
										<td className="px-6 py-3 text-sm text-gray-500">
											{safeFormat(c.sent_at ?? c.created_at, "dd/MM/yyyy")}
										</td>
										<td className="px-6 py-3 text-left" onClick={(e) => e.stopPropagation()}>
											<div className="flex justify-end gap-1">
												{(c.status === "draft" || c.status === "scheduled") && (
													<button onClick={() => router.push(`/dashboard/campaigns/${c.id}`)} className="cursor-pointer p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded" title="تعديل"><Edit className="h-4 w-4" /></button>
												)}
												{(c.status === "scheduled" || c.status === "sending") && (
													<button onClick={() => handleCancel(c)} className="cursor-pointer p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded" title="إلغاء الإرسال"><Pause className="h-4 w-4" /></button>
												)}
												{(c.status === "draft" || c.status === "cancelled") && (
													<button onClick={() => handleDelete(c)} className="cursor-pointer p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="حذف"><Trash2 className="h-4 w-4" /></button>
												)}
											</div>
										</td>
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>
			)}

			<Pagination page={page} pages={pages} total={total} limit={limit} onPage={setPage} onLimit={setLimit} />
			{confirmDialog}
		</div>
	)
}
