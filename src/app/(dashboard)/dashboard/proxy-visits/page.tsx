"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import type { ProxyVisit } from "@/types"
import { toast } from "sonner"
import { getErrorMessage, getErrorStatus } from "@/lib/api"
import { safeFormat } from "@/lib/dates"
import { countryLabel, countryOptions } from "@/lib/countries"
import { SEARCH_MIN_LENGTH } from "@/lib/use-list-page"
import {
	Loader2, Users, CheckCircle, CheckCheck, XCircle, Clock, Trash2, Search, X, ChevronDown,
	MessageCircle, Phone, Copy, RotateCcw, ArrowDownUp,
} from "lucide-react"
import { TableSkeleton } from "@/components/ui/Skeleton"
import PageHeader from "@/components/layout/PageHeader"
import Pagination from "@/components/ui/Pagination"
import Select from "@/components/ui/Select"
import DatePicker from "@/components/ui/DatePicker"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import NotesEditor from "@/components/forms/NotesEditor"
import {
	useProxyVisitsList,
	useProxyVisitCount,
	useUpdateProxyVisit,
	useDeleteProxyVisit,
} from "@/lib/queries/proxy-visits"

type Status = ProxyVisit["status"]
type StatusTab = "" | Status

const STATUS_LABEL: Record<Status, string> = {
	PENDING: "قيد الانتظار",
	APPROVED: "موافق عليه",
	COMPLETED: "مكتمل",
	REJECTED: "مرفوض",
}
const STATUS_CLASS: Record<Status, string> = {
	PENDING: "bg-yellow-100 text-yellow-800",
	APPROVED: "bg-blue-100 text-blue-800",
	COMPLETED: "bg-green-100 text-green-800",
	REJECTED: "bg-red-100 text-red-800",
}
const STATUS_ICON: Record<Status, React.ReactNode> = {
	PENDING: <Clock className="h-3.5 w-3.5" />,
	APPROVED: <CheckCircle className="h-3.5 w-3.5" />,
	COMPLETED: <CheckCheck className="h-3.5 w-3.5" />,
	REJECTED: <XCircle className="h-3.5 w-3.5" />,
}

// Transitions the API allows: PENDING→APPROVED|REJECTED|COMPLETED,
// APPROVED→COMPLETED|REJECTED|PENDING, REJECTED→PENDING|APPROVED.
// COMPLETED is final (the visitor has been messaged).
const ALLOWED: Record<Status, Status[]> = {
	PENDING: ["APPROVED", "REJECTED", "COMPLETED"],
	APPROVED: ["COMPLETED", "REJECTED", "PENDING"],
	REJECTED: ["PENDING", "APPROVED"],
	COMPLETED: [],
}
const canMove = (from: Status, to: Status) => ALLOWED[from].includes(to)

// What the row's quick buttons offer, in the order an employee usually needs them.
const QUICK: Record<Status, { to: Status; label: string; cls: string }[]> = {
	PENDING: [
		{ to: "APPROVED", label: "موافقة", cls: "bg-blue-600 text-white hover:bg-blue-700" },
		{ to: "REJECTED", label: "رفض", cls: "text-red-700 border border-red-200 hover:bg-red-50" },
	],
	APPROVED: [
		{ to: "COMPLETED", label: "إكمال", cls: "bg-green-600 text-white hover:bg-green-700" },
		{ to: "REJECTED", label: "رفض", cls: "text-red-700 border border-red-200 hover:bg-red-50" },
	],
	REJECTED: [{ to: "APPROVED", label: "موافقة", cls: "bg-blue-600 text-white hover:bg-blue-700" }],
	COMPLETED: [],
}

const waLink = (phone: string) => `https://wa.me/${phone.replace(/\D/g, "")}`

function relativeDays(iso?: string): string {
	if (!iso) return ""
	const t = new Date(iso).getTime()
	if (Number.isNaN(t)) return ""
	const days = Math.floor((Date.now() - t) / 86_400_000)
	if (days <= 0) return "اليوم"
	if (days === 1) return "أمس"
	if (days < 30) return `منذ ${days} يوماً`
	return ""
}

export default function ProxyVisitsPage() {
	const [tab, setTab] = useState<StatusTab>("PENDING")
	const [search, setSearch] = useState("")
	const [debouncedSearch, setDebouncedSearch] = useState("")
	const [country, setCountry] = useState("")
	const [dateFrom, setDateFrom] = useState("")
	const [dateTo, setDateTo] = useState("")
	const [order, setOrder] = useState<"asc" | "desc">("desc")
	const [page, setPage] = useState(1)
	const [limit, setLimit] = useState(20)
	const [expandedId, setExpandedId] = useState<string | null>(null)
	const [checked, setChecked] = useState<Set<string>>(new Set())
	const [busy, setBusy] = useState(false)
	const countries = useMemo(() => countryOptions(), [])
	const { confirm, dialog } = useConfirm()

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
	const hasOtherFilters = !!(debouncedSearch || country || dateFrom || dateTo)
	const clearFilters = () => {
		setSearch(""); setDebouncedSearch(""); setCountry(""); setDateFrom(""); setDateTo(""); setPage(1)
	}
	const shared = { search: debouncedSearch || undefined, country: country || undefined, from: fromIso, to: toIso }

	const listQuery = useProxyVisitsList({ ...shared, status: tab || undefined, order: order === "asc" ? "asc" : undefined, page, limit })
	const rawVisits = listQuery.data?.items ?? []
	// keepPreviousData would otherwise leak the previous tab's rows in for a moment.
	const visits = tab ? rawVisits.filter((v) => v.status === tab) : rawVisits
	const total = listQuery.data?.pagination.total ?? 0
	const pages = listQuery.data?.pagination.pages ?? 1
	const isLoading = listQuery.isLoading

	// Tab counts follow the search/country/date filters, so they always add up to what you'd see.
	const cAll = useProxyVisitCount(shared).data
	const cPending = useProxyVisitCount({ ...shared, status: "PENDING" }).data
	const cApproved = useProxyVisitCount({ ...shared, status: "APPROVED" }).data
	const cCompleted = useProxyVisitCount({ ...shared, status: "COMPLETED" }).data
	const cRejected = useProxyVisitCount({ ...shared, status: "REJECTED" }).data
	const counts: Record<StatusTab, number | undefined> = {
		"": cAll, PENDING: cPending, APPROVED: cApproved, COMPLETED: cCompleted, REJECTED: cRejected,
	}

	const updateVisit = useUpdateProxyVisit()
	const deleteVisit = useDeleteProxyVisit()

	// The selection only ever holds rows that are on screen.
	const visibleIds = useMemo(() => new Set(visits.map((v) => v.id)), [visits])
	const selectedVisits = visits.filter((v) => checked.has(v.id))
	const allChecked = visits.length > 0 && visits.every((v) => checked.has(v.id))
	const someChecked = selectedVisits.length > 0

	useEffect(() => {
		setChecked((prev) => {
			const next = new Set([...prev].filter((id) => visibleIds.has(id)))
			return next.size === prev.size ? prev : next
		})
	}, [visibleIds])

	const toggle = (id: string) =>
		setChecked((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
	const toggleAll = () => setChecked(allChecked ? new Set() : new Set(visits.map((v) => v.id)))

	/**
	 * Moves every eligible request to `to`. Used by the row buttons (one request) and the
	 * bulk bar (many) so both follow the same rules and confirmations.
	 */
	const applyStatus = async (targets: ProxyVisit[], to: Status) => {
		const eligible = targets.filter((v) => canMove(v.status, to))
		const skipped = targets.length - eligible.length
		if (!eligible.length) {
			toast.error(`لا يمكن نقل ${targets.length > 1 ? "هذه الطلبات" : "هذا الطلب"} إلى «${STATUS_LABEL[to]}»`)
			return
		}
		// COMPLETED sends a real WhatsApp message to each visitor — confirm before firing.
		if (to === "COMPLETED") {
			const ok = await confirm({
				title: eligible.length > 1 ? `تحديد ${eligible.length} طلبات كـ «مكتمل»؟` : 'تحديد الطلب كـ "مكتمل"؟',
				description: eligible.length > 1
					? `سيُرسل هذا الإجراء ${eligible.length} رسائل واتساب فعلية، رسالة لكل زائر. لا يمكن التراجع عن الإكمال.`
					: "سيُرسل هذا الإجراء رسالة واتساب فعلية إلى رقم هاتف الزائر لإعلامه بإكمال الزيارة. نجاح هذا الطلب لا يضمن وصول الرسالة فعلياً إلى الزائر.",
				confirmText: "تأكيد",
				tone: "warning",
			})
			if (!ok) return
		}
		setBusy(true)
		let done = 0
		let conflicts = 0
		let failed = 0
		for (const v of eligible) {
			try {
				await updateVisit.mutateAsync({ id: v.id, body: { status: to } })
				done++
			} catch (e) {
				if (getErrorStatus(e) === 409) conflicts++
				else failed++
			}
		}
		setBusy(false)
		if (done) toast.success(done > 1 ? `تم تحديث ${done} طلبات إلى «${STATUS_LABEL[to]}»` : "تم تحديث الحالة")
		if (conflicts) toast.error(`${conflicts} طلب عدّله مشرف آخر قبلك — حُدّثت القائمة، راجع حالته ثم أعد المحاولة.`)
		if (failed) toast.error(`فشل تحديث ${failed} طلب`)
		if (skipped) toast.info(`تم تخطي ${skipped} طلب لأن حالته الحالية لا تسمح بهذا الانتقال`)
		setChecked(new Set())
		if (conflicts) listQuery.refetch()
	}

	const removeVisits = async (targets: ProxyVisit[]) => {
		if (!targets.length) return
		const ok = await confirm({
			title: targets.length > 1 ? `حذف ${targets.length} طلبات؟` : `حذف طلب "${targets[0].name}"؟`,
			description: "ستُنقل إلى سلة المهملات ويمكن استعادتها لاحقاً.",
			confirmText: "حذف",
			tone: "danger",
		})
		if (!ok) return
		setBusy(true)
		let done = 0
		for (const v of targets) {
			try { await deleteVisit.mutateAsync(v.id); done++ } catch (e) { toast.error(`${v.name}: ${getErrorMessage(e, "فشل الحذف")}`) }
		}
		setBusy(false)
		if (done) toast.success(done > 1 ? `تم حذف ${done} طلبات` : "تم الحذف")
		setChecked(new Set())
		setExpandedId(null)
	}

	const saveNotes = (id: string, notes: string) =>
		updateVisit.mutate({ id, body: { notes } }, { onError: (e) => toast.error(getErrorMessage(e, "فشل حفظ الملاحظة")) })

	const copyPhone = async (phone: string) => {
		try { await navigator.clipboard.writeText(phone); toast.success("تم نسخ الرقم") } catch { toast.error("تعذّر النسخ") }
	}

	const bulkCount = (to: Status) => selectedVisits.filter((v) => canMove(v.status, to)).length
	const emptyLabel = tab || hasOtherFilters
		? "لا توجد طلبات تطابق الفلاتر الحالية"
		: "لا توجد طلبات"

	const TABS: { value: StatusTab; label: string }[] = [
		{ value: "PENDING", label: "قيد الانتظار" },
		{ value: "APPROVED", label: "موافق عليه" },
		{ value: "COMPLETED", label: "مكتمل" },
		{ value: "REJECTED", label: "مرفوض" },
		{ value: "", label: "الكل" },
	]

	return (
		<div className={`space-y-5 ${someChecked ? "pb-24" : ""}`}>
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

			{/* Status tabs with live counts — the pending count is the day's to-do number. */}
			<div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
				{TABS.map((t) => {
					const active = tab === t.value
					const n = counts[t.value]
					return (
						<button
							key={t.value || "all"}
							type="button"
							onClick={() => { setTab(t.value); setPage(1); setExpandedId(null) }}
							className={`cursor-pointer text-start rounded-lg border px-4 py-3 transition-colors ${active ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-gray-200 bg-white hover:border-gray-300"}`}
						>
							<p className={`text-xs ${active ? "text-primary" : "text-gray-500"}`}>{t.label}</p>
							<p className={`text-2xl font-semibold tabular-nums ${active ? "text-primary" : "text-gray-900"}`}>{n ?? "…"}</p>
						</button>
					)
				})}
			</div>

			<div className="bg-white shadow-sm rounded-lg border border-gray-200 p-3 space-y-3">
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
					<div className="relative lg:col-span-2">
						<Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
						<input
							type="text" value={search} maxLength={100}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="ابحث بالاسم أو الهاتف..."
							className="w-full pr-9 pl-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-primary focus:border-primary bg-white"
						/>
					</div>
					<Select
						value={country} onChange={(e) => { setCountry(e.target.value); setPage(1) }}
						aria-label="البلد"
						className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
					>
						<option value="">كل البلدان</option>
						{countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
					</Select>
					<DatePicker
						value={dateFrom} max={dateTo || undefined} placeholder="من تاريخ" aria-label="من تاريخ"
						onChange={(v) => { setDateFrom(v); setPage(1) }}
						className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
					/>
					<DatePicker
						value={dateTo} min={dateFrom || undefined} placeholder="إلى تاريخ" aria-label="إلى تاريخ"
						onChange={(v) => { setDateTo(v); setPage(1) }}
						className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
					/>
				</div>
				{hasOtherFilters && (
					<div className="flex items-center justify-between text-xs text-gray-500">
						<span>الفلاتر مفعّلة — الأعداد أعلاه تخص النتائج المطابقة فقط</span>
						<button type="button" onClick={clearFilters} className="cursor-pointer inline-flex items-center gap-1 text-primary hover:underline">
							<X className="h-3.5 w-3.5" />مسح الفلاتر
						</button>
					</div>
				)}
			</div>

			<div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="w-10 px-3 py-3">
									<input
										type="checkbox" checked={allChecked} onChange={toggleAll} disabled={visits.length === 0}
										aria-label="تحديد كل الطلبات في الصفحة"
										className="h-4 w-4 rounded text-primary cursor-pointer"
									/>
								</th>
								<th className="px-3 py-3 text-right text-xs font-medium text-gray-500">الاسم</th>
								<th className="px-3 py-3 text-right text-xs font-medium text-gray-500">الهاتف</th>
								<th className="px-3 py-3 text-right text-xs font-medium text-gray-500">البلد</th>
								<th className="px-3 py-3 text-right text-xs font-medium text-gray-500">
									<button type="button" onClick={() => setOrder(order === "desc" ? "asc" : "desc")}
										className="cursor-pointer inline-flex items-center gap-1 hover:text-gray-800" title="تغيير الترتيب">
										التاريخ <ArrowDownUp className="h-3 w-3" />
										<span className="text-[10px] text-gray-400">({order === "desc" ? "الأحدث أولاً" : "الأقدم أولاً"})</span>
									</button>
								</th>
								<th className="px-3 py-3 text-right text-xs font-medium text-gray-500">الحالة</th>
								<th className="px-3 py-3 text-right text-xs font-medium text-gray-500">إجراء سريع</th>
								<th className="w-10 px-2 py-3" />
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{isLoading ? (
								<TableSkeleton rows={6} cols={8} />
							) : listQuery.isError ? (
								<tr>
									<td colSpan={8} className="px-6 py-12 text-center">
										<p className="text-red-600 text-sm mb-3">{getErrorMessage(listQuery.error, "تعذّر تحميل الطلبات")}</p>
										<button type="button" onClick={() => listQuery.refetch()} className="cursor-pointer px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50">إعادة المحاولة</button>
									</td>
								</tr>
							) : visits.length === 0 ? (
								<tr>
									<td colSpan={8} className="px-6 py-12 text-center text-gray-500">
										<Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
										<p>{emptyLabel}</p>
									</td>
								</tr>
							) : (
								visits.map((v) => {
									const isOpen = expandedId === v.id
									const isChecked = checked.has(v.id)
									const when = v.submitted_at ?? v.created_at
									const rel = relativeDays(when)
									return (
										<Fragment key={v.id}>
											<tr className={`${isChecked ? "bg-primary/5" : isOpen ? "bg-gray-50" : "hover:bg-gray-50"}`}>
												<td className="px-3 py-3">
													<input
														type="checkbox" checked={isChecked} onChange={() => toggle(v.id)}
														aria-label={`تحديد ${v.name}`}
														className="h-4 w-4 rounded text-primary cursor-pointer"
													/>
												</td>
												<td className="px-3 py-3 text-sm font-medium text-gray-900">
													<button type="button" onClick={() => setExpandedId(isOpen ? null : v.id)} className="cursor-pointer text-start hover:text-primary">
														{v.name}
													</button>
													{v.notes && <span className="mr-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">ملاحظة</span>}
												</td>
												<td className="px-3 py-3 text-sm text-gray-600">
													{v.phone ? (
														<div className="flex items-center gap-1">
															<span dir="ltr" className="tabular-nums">{v.phone}</span>
															<a href={waLink(v.phone)} target="_blank" rel="noreferrer" title="مراسلة عبر واتساب" aria-label="واتساب"
																className="p-1 rounded text-green-600 hover:bg-green-50"><MessageCircle className="h-4 w-4" /></a>
															<a href={`tel:${v.phone}`} title="اتصال" aria-label="اتصال"
																className="p-1 rounded text-gray-500 hover:bg-gray-100"><Phone className="h-4 w-4" /></a>
															<button type="button" onClick={() => copyPhone(v.phone!)} title="نسخ الرقم" aria-label="نسخ الرقم"
																className="cursor-pointer p-1 rounded text-gray-500 hover:bg-gray-100"><Copy className="h-4 w-4" /></button>
														</div>
													) : "—"}
												</td>
												<td className="px-3 py-3 text-sm text-gray-600">{countryLabel(v.country)}</td>
												<td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">
													{safeFormat(when, "dd/MM/yyyy")}
													{rel && <span className="block text-[11px] text-gray-400">{rel}</span>}
												</td>
												<td className="px-3 py-3">
													<span className={`px-2 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full ${STATUS_CLASS[v.status]}`}>
														{STATUS_ICON[v.status]}{STATUS_LABEL[v.status]}
													</span>
												</td>
												<td className="px-3 py-3">
													<div className="flex gap-1.5">
														{QUICK[v.status].map((a) => (
															<button
																key={a.to} type="button" disabled={busy}
																onClick={() => applyStatus([v], a.to)}
																className={`cursor-pointer px-2.5 py-1 text-xs font-medium rounded-md disabled:opacity-50 ${a.cls}`}
															>
																{a.label}
															</button>
														))}
													</div>
												</td>
												<td className="px-2 py-3">
													<button type="button" onClick={() => setExpandedId(isOpen ? null : v.id)} aria-label="تفاصيل"
														className="cursor-pointer p-1 rounded text-gray-500 hover:bg-gray-100">
														<ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
													</button>
												</td>
											</tr>
											{isOpen && (
												<tr className="bg-gray-50">
													<td />
													<td colSpan={7} className="px-3 pb-4 pt-1">
														<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
															<NotesEditor
																value={v.notes}
																onSave={(notes) => saveNotes(v.id, notes)}
																saving={updateVisit.isPending}
															/>
															<div className="flex flex-wrap items-start gap-2">
																{canMove(v.status, "PENDING") && (
																	<button type="button" disabled={busy} onClick={() => applyStatus([v], "PENDING")}
																		className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-700 border border-gray-300 rounded-md hover:bg-white disabled:opacity-50">
																		<RotateCcw className="h-3.5 w-3.5" />إعادة إلى قيد الانتظار
																	</button>
																)}
																{v.status === "PENDING" && (
																	<button type="button" disabled={busy} onClick={() => applyStatus([v], "COMPLETED")}
																		className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-green-700 border border-green-200 rounded-md hover:bg-green-50 disabled:opacity-50">
																		<CheckCheck className="h-3.5 w-3.5" />إكمال مباشرة
																	</button>
																)}
																{v.status === "COMPLETED" && (
																	<p className="text-xs text-gray-500 leading-relaxed bg-white border border-gray-100 rounded-md p-3">
																		الطلب مكتمل، وقد أُرسل إشعار إلى الزائر — لا يمكن تغيير حالته بعد ذلك.
																	</p>
																)}
																<button type="button" disabled={busy} onClick={() => removeVisits([v])}
																	className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-md hover:bg-red-50 disabled:opacity-50 mr-auto">
																	<Trash2 className="h-3.5 w-3.5" />حذف الطلب
																</button>
															</div>
														</div>
													</td>
												</tr>
											)}
										</Fragment>
									)
								})
							)}
						</tbody>
					</table>
				</div>
			</div>

			<Pagination
				page={page} pages={pages} total={total} limit={limit}
				onPage={setPage}
				onLimit={(n) => { setLimit(n); setPage(1) }}
			/>

			{/* Bulk bar: appears as soon as one row is ticked and stays reachable however far you scroll. */}
			{someChecked && (
				<div className="fixed bottom-4 inset-x-4 z-40 mx-auto max-w-4xl bg-gray-900 text-white rounded-xl shadow-2xl px-4 py-3 flex flex-wrap items-center gap-2">
					<span className="text-sm font-medium ml-2">
						{busy && <Loader2 className="inline h-4 w-4 animate-spin ml-1" />}تم تحديد {selectedVisits.length}
					</span>
					{(["APPROVED", "REJECTED", "COMPLETED", "PENDING"] as Status[]).map((to) => {
						const n = bulkCount(to)
						if (!n) return null
						const label = { APPROVED: "موافقة", REJECTED: "رفض", COMPLETED: "إكمال", PENDING: "إعادة للانتظار" }[to]
						return (
							<button
								key={to} type="button" disabled={busy}
								onClick={() => applyStatus(selectedVisits, to)}
								className="cursor-pointer px-3 py-1.5 text-xs font-medium rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-50"
							>
								{label} ({n})
							</button>
						)
					})}
					<button type="button" disabled={busy} onClick={() => removeVisits(selectedVisits)}
						className="cursor-pointer px-3 py-1.5 text-xs font-medium rounded-md bg-red-500/80 hover:bg-red-500 disabled:opacity-50">
						حذف ({selectedVisits.length})
					</button>
					<button type="button" onClick={() => setChecked(new Set())} className="cursor-pointer mr-auto text-xs text-white/70 hover:text-white inline-flex items-center gap-1">
						<X className="h-3.5 w-3.5" />إلغاء التحديد
					</button>
				</div>
			)}
			{dialog}
		</div>
	)
}
