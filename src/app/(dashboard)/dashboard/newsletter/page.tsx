"use client"

import { useEffect, useState } from "react"
import type { Subscriber } from "@/types"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api"
import { format } from "date-fns"
import { safeFormat } from "@/lib/dates"
import Pagination from "@/components/ui/Pagination"
import EmptyState from "@/components/ui/EmptyState"
import PageHeader from "@/components/layout/PageHeader"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { TableSkeleton } from "@/components/ui/Skeleton"
import { Download, Mail, Users, UserCheck, UserX, Trash2, Search, Newspaper } from "lucide-react"
import {
	useSubscribersList,
	useSubscriberCount,
	useToggleSubscriber,
	useDeleteSubscriber,
} from "@/lib/queries/newsletter"

type Filter = "all" | "active" | "inactive"

export default function NewsletterPage() {
	const [filter, setFilter] = useState<Filter>("all")
	const [search, setSearch] = useState("")
	const [debouncedSearch, setDebouncedSearch] = useState("")
	const [page, setPage] = useState(1)
	const [limit, setLimit] = useState(50)
	const { confirm, dialog } = useConfirm()

	useEffect(() => {
		const t = setTimeout(() => {
			setDebouncedSearch(search.trim())
			setPage(1)
		}, 300)
		return () => clearTimeout(t)
	}, [search])

	const onFilterChange = (f: Filter) => { setFilter(f); setPage(1) }
	const onLimitChange = (n: number) => { setLimit(n); setPage(1) }

	// Each count is its own query — Query dedupes if the user flips filters fast.
	const allCount = useSubscriberCount({})
	const activeCount = useSubscriberCount({ is_active: true })
	const inactiveCount = useSubscriberCount({ is_active: false })

	const listParams: { page: number; limit: number; is_active?: boolean; search?: string } = { page, limit }
	if (filter === "active") listParams.is_active = true
	else if (filter === "inactive") listParams.is_active = false
	if (debouncedSearch) listParams.search = debouncedSearch

	const subscribersQuery = useSubscribersList(listParams)
	const subscribers = subscribersQuery.data?.items ?? []
	const total = subscribersQuery.data?.pagination.total ?? 0
	const pages = subscribersQuery.data?.pagination.pages ?? 1
	const loading = subscribersQuery.isLoading

	const toggleSubscriber = useToggleSubscriber()
	const deleteSubscriber = useDeleteSubscriber()

	const toggleStatus = (s: Subscriber) => {
		toggleSubscriber.mutate(
			{ id: s.id, is_active: s.is_active },
			{
				onSuccess: () => toast.success(s.is_active ? "تم التعطيل" : "تم التفعيل"),
				onError: (e) => toast.error(getErrorMessage(e, "تعذّر التحديث")),
			},
		)
	}

	const handleDelete = async (s: Subscriber) => {
		const ok = await confirm({
			title: `حذف المشترك "${s.email}"؟`,
			description: "سيُحذف نهائياً ولن يتلقى أي رسائل لاحقاً. لا يمكن التراجع.",
			confirmText: "حذف نهائي",
			tone: "danger",
		})
		if (!ok) return
		deleteSubscriber.mutate(s.id, {
			onSuccess: () => toast.success("تم الحذف"),
			onError: (e) => toast.error(getErrorMessage(e, "تعذّر الحذف")),
		})
	}

	const exportCSV = () => {
		const csv = [
			["البريد الإلكتروني", "الحالة", "تاريخ الاشتراك"].join(","),
			...subscribers.map((s) => [s.email, s.is_active ? "نشط" : "غير نشط", new Date(s.created_at).toISOString()].join(",")),
		].join("\n")
		const a = document.createElement("a")
		a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }))
		a.download = `subscribers-${format(new Date(), "yyyy-MM-dd")}.csv`
		a.click()
	}

	const filterLabels: Record<Filter, string> = { all: "الكل", active: "النشطون", inactive: "المعطّلون" }
	const cards: Array<{ key: Filter; label: string; value: number; icon: typeof Users; color: string; bg: string }> = [
		{ key: "all", label: "الإجمالي", value: allCount.data ?? 0, icon: Users, color: "text-gray-500", bg: "bg-gray-100" },
		{ key: "active", label: "النشطون", value: activeCount.data ?? 0, icon: UserCheck, color: "text-green-600", bg: "bg-green-50" },
		{ key: "inactive", label: "المعطّلون", value: inactiveCount.data ?? 0, icon: UserX, color: "text-red-600", bg: "bg-red-50" },
	]

	return (
		<div className="space-y-6">
			<PageHeader
				title="النشرة البريدية"
				description="إدارة مشتركي النشرة البريدية. اضغط البطاقات في الأعلى للتصفية."
				icon={Newspaper}
				actions={
					<button onClick={exportCSV} disabled={!subscribers.length} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors">
						<Download className="h-4 w-4" />تصدير CSV
					</button>
				}
			/>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				{cards.map(({ key, label, value, icon: Icon, color, bg }) => (
					<button
						key={key}
						onClick={() => onFilterChange(key)}
						className={`cursor-pointer bg-white rounded-xl border p-5 flex items-center gap-4 text-right transition ${filter === key ? "border-primary ring-2 ring-primary/20" : "border-gray-200 hover:border-gray-300"}`}
					>
						<div className={`p-3 rounded-lg ${bg}`}><Icon className={`h-6 w-6 ${color}`} /></div>
						<div>
							<p className="text-sm text-gray-500">{label}</p>
							<p className="text-2xl font-semibold text-gray-900">{value}</p>
						</div>
					</button>
				))}
			</div>

			<div className="flex flex-col sm:flex-row gap-3">
				<div className="flex gap-2">
					{(["all", "active", "inactive"] as const).map((f) => (
						<button key={f} onClick={() => onFilterChange(f)}
							className={`cursor-pointer px-4 py-2 text-sm font-medium rounded-md transition-colors ${filter === f ? "bg-primary text-white" : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"}`}>
							{filterLabels[f]}
						</button>
					))}
				</div>
				<div className="relative flex-1 max-w-sm">
					<Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
					<input
						type="text" placeholder="ابحث بالبريد الإلكتروني..."
						value={search} onChange={(e) => setSearch(e.target.value)}
						className="w-full pr-9 pl-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
					/>
				</div>
			</div>

			<div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">البريد الإلكتروني</th>
							<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
							<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ الاشتراك</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">إجراءات</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{loading ? (
							<TableSkeleton rows={5} cols={4} />
						) : subscribers.length === 0 ? (
							<tr><td colSpan={4} className="px-6 py-0">
								<EmptyState
									icon={Mail}
									title={debouncedSearch ? "لا توجد نتائج" : filter === "active" ? "لا يوجد مشتركون نشطون" : filter === "inactive" ? "لا يوجد مشتركون معطّلون" : "لا يوجد مشتركون بعد"}
									description={debouncedSearch ? "جرّب بريداً مختلفاً." : filter === "all" ? "ستظهر هنا عناوين البريد التي اشتركت في النشرة من الموقع." : "غيّر الفلتر لعرض كل المشتركين."}
								/>
							</td></tr>
						) : subscribers.map((s) => (
							<tr key={s.id} className="hover:bg-gray-50">
								<td className="px-6 py-4 text-sm font-medium text-gray-900" dir="ltr">{s.email}</td>
								<td className="px-6 py-4">
									<span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${s.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
										{s.is_active ? "نشط" : "معطّل"}
									</span>
								</td>
								<td className="px-6 py-4 text-sm text-gray-500">{safeFormat(s.created_at, "dd/MM/yyyy")}</td>
								<td className="px-6 py-4 text-left text-sm flex justify-end items-center gap-3">
									<button onClick={() => toggleStatus(s)} className={`cursor-pointer text-sm font-medium ${s.is_active ? "text-red-600 hover:text-red-900" : "text-green-600 hover:text-green-900"}`}>
										{s.is_active ? "تعطيل" : "تفعيل"}
									</button>
									<button onClick={() => handleDelete(s)} className="cursor-pointer text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<Pagination page={page} pages={pages} total={total} limit={limit} onPage={setPage} onLimit={onLimitChange} />
			{dialog}
		</div>
	)
}
