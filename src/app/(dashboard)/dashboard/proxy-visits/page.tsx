"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import type { ProxyVisit } from "@/types"
import { toast } from "sonner"
import { getErrorMessage, getErrorStatus } from "@/lib/api"
import { safeFormat } from "@/lib/dates"
import { countryLabel, countryOptions } from "@/lib/countries"
import { SEARCH_MIN_LENGTH } from "@/lib/use-list-page"
import { Loader2, Users, CheckCircle, XCircle, Clock, Trash2, Search, X } from "lucide-react"
import { TableSkeleton } from "@/components/ui/Skeleton"
import FilterPills from "@/components/ui/FilterPills"
import PageHeader from "@/components/layout/PageHeader"
import Pagination from "@/components/ui/Pagination"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import NotesEditor from "@/components/forms/NotesEditor"
import {
	useProxyVisitsList,
	useUpdateProxyVisit,
	useDeleteProxyVisit,
} from "@/lib/queries/proxy-visits"

export default function ProxyVisitsPage() {
	const [selectedId, setSelectedId] = useState<string | null>(null)
	const [statusFilter, setStatusFilter] = useState<
		"" | "PENDING" | "APPROVED" | "COMPLETED" | "REJECTED"
	>("")
	const [search, setSearch] = useState("")
	const [debouncedSearch, setDebouncedSearch] = useState("")
	const [country, setCountry] = useState("")
	const [dateFrom, setDateFrom] = useState("")
	const [dateTo, setDateTo] = useState("")
	const [page, setPage] = useState(1)
	const [limit, setLimit] = useState(20)
	const countries = useMemo(() => countryOptions(), [])

	// A 1-letter search is noise: wait for 2+ characters, debounced.
	useEffect(() => {
		const t = setTimeout(() => {
			const q = search.trim()
			setDebouncedSearch(q.length >= SEARCH_MIN_LENGTH ? q : "")
			setPage(1)
		}, 300)
		return () => clearTimeout(t)
	}, [search])

	// Date inputs are whole local days: from = start of that day, to = end of it.
	const fromIso = dateFrom ? new Date(`${dateFrom}T00:00:00`).toISOString() : undefined
	const toIso = dateTo ? new Date(`${dateTo}T23:59:59.999`).toISOString() : undefined
	const hasFilters = !!(statusFilter || debouncedSearch || country || dateFrom || dateTo)
	const clearFilters = () => {
		setStatusFilter(""); setSearch(""); setDebouncedSearch(""); setCountry("")
		setDateFrom(""); setDateTo(""); setPage(1)
	}

	// Server-side pagination + filters on GET /forms/proxy-visits.
	const listQuery = useProxyVisitsList({
		status: statusFilter || undefined,
		search: debouncedSearch || undefined,
		country: country || undefined,
		from: fromIso,
		to: toIso,
		page,
		limit,
	})
	const rawVisits = listQuery.data?.items ?? []
	// `keepPreviousData` keeps the previous filter's rows on screen while the new
	// query is in flight; refilter by status so other statuses don't leak in.
	const visits = statusFilter
		? rawVisits.filter((v) => v.status === statusFilter)
		: rawVisits
	const total = listQuery.data?.pagination.total ?? 0
	const pages = listQuery.data?.pagination.pages ?? 1
	const isLoading = listQuery.isLoading
	const isFetching = listQuery.isFetching
	// The panel follows the live row, so it never shows stale data and closes
	// by itself when the row leaves the current page or filter.
	const selected = visits.find((v) => v.id === selectedId) ?? null
	const setSelected = (v: ProxyVisit | null) => setSelectedId(v?.id ?? null)

	const updateVisit = useUpdateProxyVisit()
	const deleteVisit = useDeleteProxyVisit()
	const notesMutation = useUpdateProxyVisit()
	const { confirm, dialog } = useConfirm()

	const updateStatus = async (id: string, status: ProxyVisit["status"]) => {
		// COMPLETED sends a real WhatsApp message to the visitor's phone — confirm
		// before firing it. No such side effect on APPROVED/REJECTED.
		if (status === "COMPLETED") {
			const ok = await confirm({
				title: 'تحديد الطلب كـ "مكتمل"؟',
				description: "سيُرسل هذا الإجراء رسالة واتساب فعلية إلى رقم هاتف الزائر لإعلامه بإكمال الزيارة. نجاح هذا الطلب لا يضمن وصول الرسالة فعلياً إلى الزائر.",
				confirmText: "تأكيد",
				tone: "warning",
			})
			if (!ok) return
		}
		updateVisit.mutate(
			{ id, body: { status } },
			{
				onSuccess: () => {
					toast.success("تم تحديث الحالة")
					setSelected(null)
				},
				onError: (e) => {
					// 409 = another admin changed this request first (the API compares
					// against the status it last read). Reload instead of overwriting.
					if (getErrorStatus(e) === 409) {
						toast.error("عدّل مشرف آخر هذا الطلب قبلك — حُدّثت القائمة، راجع حالته ثم أعد المحاولة.")
						setSelected(null)
						listQuery.refetch()
						return
					}
					toast.error(getErrorMessage(e, "فشل تحديث الحالة"))
				},
			},
		)
	}

	const saveNotes = (id: string, notes: string) => {
		notesMutation.mutate(
			{ id, body: { notes } },
			{
				onError: (e) => toast.error(getErrorMessage(e, "فشل حفظ الملاحظة")),
			},
		)
	}

	const handleDelete = async (v: ProxyVisit) => {
		const ok = await confirm({
			title: `حذف طلب "${v.name}"؟`,
			description: "سيُنقل إلى سلة المهملات ويمكن استعادته لاحقاً.",
			confirmText: "حذف",
			tone: "danger",
		})
		if (!ok) return
		deleteVisit.mutate(v.id, {
			onSuccess: () => {
				toast.success("تم الحذف")
				setSelected(null)
			},
			onError: (e) => toast.error(getErrorMessage(e, "فشل الحذف")),
		})
	}

	const statusClass = (s: ProxyVisit["status"]) =>
		({
			PENDING: "bg-yellow-100 text-yellow-800",
			APPROVED: "bg-blue-100 text-blue-800",
			COMPLETED: "bg-green-100 text-green-800",
			REJECTED: "bg-red-100 text-red-800",
		})[s]

	const statusIcon = (s: ProxyVisit["status"]) =>
		({
			PENDING: <Clock className="h-4 w-4" />,
			APPROVED: <CheckCircle className="h-4 w-4" />,
			COMPLETED: <CheckCircle className="h-4 w-4" />,
			REJECTED: <XCircle className="h-4 w-4" />,
		})[s]

	const statusLabel = (s: ProxyVisit["status"]) =>
		({
			PENDING: "قيد الانتظار",
			APPROVED: "موافق عليه",
			COMPLETED: "مكتمل",
			REJECTED: "مرفوض",
		})[s]

	const filterLabels: Record<string, string> = {
		"": "الكل",
		PENDING: "قيد الانتظار",
		APPROVED: "موافق عليه",
		COMPLETED: "مكتمل",
		REJECTED: "مرفوض",
	}

	const emptyLabel = hasFilters ? "لا توجد طلبات تطابق الفلاتر الحالية" : "لا توجد طلبات"

	return (
		<div className="space-y-6">
			<PageHeader
				title="طلبات الزيارة بالإنابة"
				description="طلبات الزيارة الواردة من الموقع — تحديد الطلب كَ «مكتمل» فقط يُرسل إشعار واتساب فعلياً إلى الزائر."
				icon={Users}
				actions={
					<Link
						href="/dashboard/proxy-visits/trash"
						className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-sm text-foreground border border-[hsl(var(--border-strong))] rounded-md hover:bg-surface-muted transition-colors"
					>
						<Trash2 className="h-4 w-4" strokeWidth={1.6} />سلة المهملات
					</Link>
				}
			/>

			<div className="bg-white shadow-sm rounded-lg border border-gray-200 p-4 space-y-3">
				<div className="flex gap-2 flex-wrap items-center">
					<FilterPills
						value={statusFilter}
						onChange={(v) => { setStatusFilter(v); setPage(1) }}
						options={[
							{ value: "", label: filterLabels[""] },
							{ value: "PENDING", label: filterLabels.PENDING },
							{ value: "APPROVED", label: filterLabels.APPROVED },
							{ value: "COMPLETED", label: filterLabels.COMPLETED },
							{ value: "REJECTED", label: filterLabels.REJECTED },
						]}
					/>
					{isFetching && !isLoading && (
						<Loader2 className="h-4 w-4 animate-spin text-primary" aria-label="جارٍ التحميل" />
					)}
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
					<div className="relative">
						<Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
						<input
							type="text" value={search} maxLength={100}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="ابحث بالاسم أو الهاتف..."
							className="w-full pr-9 pl-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-primary focus:border-primary bg-white"
						/>
					</div>
					<select
						value={country} onChange={(e) => { setCountry(e.target.value); setPage(1) }}
						aria-label="البلد"
						className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-primary focus:border-primary bg-white"
					>
						<option value="">كل البلدان</option>
						{countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
					</select>
					<label className="flex items-center gap-2 text-xs text-gray-500">
						<span className="shrink-0">من</span>
						<input
							type="date" value={dateFrom} max={dateTo || undefined}
							onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
							className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:ring-primary focus:border-primary bg-white"
						/>
					</label>
					<label className="flex items-center gap-2 text-xs text-gray-500">
						<span className="shrink-0">إلى</span>
						<input
							type="date" value={dateTo} min={dateFrom || undefined}
							onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
							className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:ring-primary focus:border-primary bg-white"
						/>
					</label>
				</div>
				<div className="flex items-center justify-between text-xs text-gray-500">
					<span>{total} طلب{hasFilters ? " مطابق للفلاتر" : ""}</span>
					{hasFilters && (
						<button type="button" onClick={clearFilters} className="cursor-pointer inline-flex items-center gap-1 text-primary hover:underline">
							<X className="h-3.5 w-3.5" />مسح الفلاتر
						</button>
					)}
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
				<div className="lg:col-span-2 bg-white shadow-sm rounded-lg overflow-hidden">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
									الاسم
								</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
									الهاتف
								</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
									البلد
								</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
									الحالة
								</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
									التاريخ
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{isLoading ? (
								<TableSkeleton rows={6} cols={5} />
							) : visits.length === 0 ? (
								<tr>
									<td
										colSpan={5}
										className="px-6 py-12 text-center text-gray-500"
									>
										<Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
										<p>{emptyLabel}</p>
									</td>
								</tr>
							) : (
								visits.map((v) => (
									<tr
										key={v.id}
										onClick={() => setSelected(v)}
										className={`cursor-pointer hover:bg-gray-50 ${v.id === selectedId ? "bg-primary/5 shadow-[inset_-3px_0_0_hsl(var(--primary))]" : ""}`}
									>
										<td className="px-6 py-4 text-sm font-medium text-gray-900">
											{v.name}
										</td>
										<td className="px-6 py-4 text-sm text-gray-500">
											{v.phone || "—"}
										</td>
										<td className="px-6 py-4 text-sm text-gray-500">
											{countryLabel(v.country)}
										</td>
										<td className="px-6 py-4">
											<span
												className={`px-2 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full ${statusClass(v.status)}`}
											>
												{statusIcon(v.status)}
												{statusLabel(v.status)}
											</span>
										</td>
										<td className="px-6 py-4 text-sm text-gray-500">
											{safeFormat(
												v.submitted_at ?? v.created_at,
												"dd/MM/yyyy",
											)}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>

				{selected ? (
					<div className="fixed inset-x-0 bottom-0 z-40 max-h-[85vh] overflow-y-auto rounded-t-2xl shadow-2xl bg-white p-6 space-y-4 lg:static lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:rounded-lg lg:shadow-sm lg:border lg:border-gray-200">
						<div className="flex items-center justify-between">
							<h3 className="text-lg font-medium text-gray-900">
								التفاصيل
							</h3>
							<button type="button" onClick={() => setSelectedId(null)} aria-label="إغلاق" className="cursor-pointer p-1 rounded hover:bg-gray-100 text-gray-500">
								<X className="h-5 w-5" />
							</button>
						</div>
						<span className={`px-2 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full ${statusClass(selected.status)}`}>
							{statusIcon(selected.status)}
							{statusLabel(selected.status)}
						</span>
						<div>
							<label className="text-sm font-medium text-gray-500">
								الاسم
							</label>
							<p className="mt-1 text-sm text-gray-900">
								{selected.name}
							</p>
						</div>
						{selected.phone && (
							<div>
								<label className="text-sm font-medium text-gray-500">
									الهاتف
								</label>
								<p className="mt-1 text-sm text-gray-900">
									{selected.phone}
								</p>
							</div>
						)}
						{selected.country && (
							<div>
								<label className="text-sm font-medium text-gray-500">
									البلد
								</label>
								<p className="mt-1 text-sm text-gray-900">
									{countryLabel(selected.country)}
								</p>
							</div>
						)}
						<NotesEditor
							value={selected.notes}
							onSave={(notes) => saveNotes(selected.id, notes)}
							saving={notesMutation.isPending}
						/>
						<div className="space-y-2 pt-2">
							{selected.status === "PENDING" && (
								<>
									<button
										onClick={() =>
											updateStatus(
												selected.id,
												"APPROVED",
											)
										}
										className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
									>
										موافقة
									</button>
									<button
										onClick={() =>
											updateStatus(
												selected.id,
												"REJECTED",
											)
										}
										className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
									>
										رفض
									</button>
								</>
							)}
							{/* Transitions the API allows: PENDING→APPROVED|REJECTED|COMPLETED,
							    APPROVED→COMPLETED|REJECTED|PENDING, REJECTED→PENDING|APPROVED.
							    COMPLETED is final (the visitor has been messaged). Going back
							    to PENDING clears who/when processed it. */}
							{selected.status === "APPROVED" && (
								<>
									<button
										onClick={() =>
											updateStatus(selected.id, "COMPLETED")
										}
										className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
									>
										تحديد كـ &quot;مكتمل&quot;
									</button>
									<button
										onClick={() => updateStatus(selected.id, "REJECTED")}
										className="w-full px-4 py-2 text-sm text-red-700 border border-red-200 rounded-md hover:bg-red-50"
									>
										رفض
									</button>
									<button
										onClick={() => updateStatus(selected.id, "PENDING")}
										className="w-full px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
									>
										إعادة إلى قيد الانتظار
									</button>
								</>
							)}
							{selected.status === "REJECTED" && (
								<>
									<button
										onClick={() => updateStatus(selected.id, "APPROVED")}
										className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
									>
										موافقة
									</button>
									<button
										onClick={() => updateStatus(selected.id, "PENDING")}
										className="w-full px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
									>
										إعادة إلى قيد الانتظار
									</button>
								</>
							)}
							{selected.status === "COMPLETED" && (
								<p className="text-xs text-gray-500 leading-relaxed bg-gray-50 border border-gray-100 rounded-md p-3">
									الطلب مكتمل، وقد أُرسل إشعار إلى الزائر — لا يمكن تغيير حالته بعد ذلك.
								</p>
							)}
							<button
								onClick={() => handleDelete(selected)}
								className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-600 border border-red-200 rounded-md hover:bg-red-50"
							>
								<Trash2 className="h-4 w-4" />حذف الطلب
							</button>
						</div>
					</div>
				) : (
					<div className="hidden lg:flex flex-col items-center justify-center gap-2 sticky top-4 bg-white border border-dashed border-gray-300 rounded-lg p-10 text-center text-sm text-gray-500">
						<Users className="h-10 w-10 text-gray-300" />
						اختر طلباً من القائمة لعرض تفاصيله وتحديث حالته
					</div>
				)}
			</div>

			<Pagination
				page={page} pages={pages} total={total} limit={limit}
				onPage={setPage}
				onLimit={(n) => { setLimit(n); setPage(1) }}
			/>
			{dialog}
		</div>
	)
}
