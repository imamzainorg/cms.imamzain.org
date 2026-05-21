"use client"

import { useEffect, useState } from "react"
import type { AuditLog } from "@/types"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api"
import Pagination from "@/components/ui/Pagination"
import EmptyState from "@/components/ui/EmptyState"
import PageHeader from "@/components/layout/PageHeader"
import { ListSkeleton } from "@/components/ui/Skeleton"
import {
	ClipboardList, Filter, X, ChevronDown, ChevronUp,
	Plus, Pencil, Trash2, LogIn, LogOut, Upload, Eye, Send, type LucideIcon,
} from "lucide-react"
import { safeFormat } from "@/lib/dates"
import { humanizeAuditAction, humanizeResource } from "@/lib/humanize"
import { useAuditLogsList } from "@/lib/queries/audit-logs"

type ActionStyle = {
	icon: LucideIcon
	color: string
	dotColor: string
}

const ACTION_ICON_MAP: { match: string; style: ActionStyle }[] = [
	{ match: "create", style: { icon: Plus, color: "bg-emerald-50 text-emerald-700 border border-emerald-100", dotColor: "bg-emerald-500" } },
	{ match: "update", style: { icon: Pencil, color: "bg-amber-50 text-amber-700 border border-amber-100", dotColor: "bg-amber-500" } },
	{ match: "delete", style: { icon: Trash2, color: "bg-red-50 text-red-700 border border-red-100", dotColor: "bg-red-500" } },
	{ match: "remove", style: { icon: Trash2, color: "bg-red-50 text-red-700 border border-red-100", dotColor: "bg-red-500" } },
	{ match: "login", style: { icon: LogIn, color: "bg-blue-50 text-blue-700 border border-blue-100", dotColor: "bg-blue-500" } },
	{ match: "logout", style: { icon: LogOut, color: "bg-gray-100 text-gray-700 border border-gray-200", dotColor: "bg-gray-500" } },
	{ match: "upload", style: { icon: Upload, color: "bg-purple-50 text-purple-700 border border-purple-100", dotColor: "bg-purple-500" } },
	{ match: "publish", style: { icon: Send, color: "bg-emerald-50 text-emerald-700 border border-emerald-100", dotColor: "bg-emerald-500" } },
	{ match: "view", style: { icon: Eye, color: "bg-gray-50 text-gray-700 border border-gray-200", dotColor: "bg-gray-400" } },
]

function actionStyle(action: string): ActionStyle {
	const lower = (action || "").toLowerCase()
	for (const { match, style } of ACTION_ICON_MAP) {
		if (lower.includes(match)) return style
	}
	return { icon: ClipboardList, color: "bg-gray-100 text-gray-700 border border-gray-200", dotColor: "bg-gray-400" }
}

function pickResourceTitle(log: AuditLog): string | null {
	const changes = log.changes as Record<string, unknown> | null | undefined
	if (!changes) return null
	const candidates = ["title", "name", "filename", "subject", "email", "username"]
	for (const key of candidates) {
		const v = changes[key]
		if (typeof v === "string" && v.trim()) return v
	}
	const translations = changes.translations as unknown
	if (Array.isArray(translations) && translations[0] && typeof translations[0] === "object") {
		const first = translations[0] as Record<string, unknown>
		const t = first.title ?? first.name
		if (typeof t === "string" && t.trim()) return t
	}
	return null
}

export default function AuditLogsPage() {
	const [page, setPage] = useState(1)
	const [limit, setLimit] = useState(30)
	const [showFilters, setShowFilters] = useState(false)
	const [expanded, setExpanded] = useState<string | null>(null)
	const [filters, setFilters] = useState({ action: "", resource_type: "", from: "", to: "" })
	const [appliedFilters, setAppliedFilters] = useState(filters)

	const onLimitChange = (n: number) => { setLimit(n); setPage(1) }

	const listQuery = useAuditLogsList({
		page, limit,
		...Object.fromEntries(Object.entries(appliedFilters).filter(([, v]) => v)),
	})
	const logs = listQuery.data?.items ?? []
	const total = listQuery.data?.pagination?.total ?? 0
	const pages = listQuery.data?.pagination?.pages ?? 1
	const loading = listQuery.isLoading

	useEffect(() => {
		if (listQuery.error) toast.error(getErrorMessage(listQuery.error, "فشل تحميل السجلات"))
	}, [listQuery.error])

	const applyFilters = (e: React.FormEvent) => {
		e.preventDefault()
		setPage(1)
		setAppliedFilters(filters)
	}

	const clearFilters = () => {
		const empty = { action: "", resource_type: "", from: "", to: "" }
		setFilters(empty)
		setAppliedFilters(empty)
		setPage(1)
	}

	const hasActiveFilters = Object.values(appliedFilters).some(Boolean)

	return (
		<div className="space-y-6">
			<PageHeader
				title="سجلات التدقيق"
				description="تتبّع كل النشاطات والتغييرات على المحتوى"
				icon={ClipboardList}
				actions={
					<button
						onClick={() => setShowFilters(!showFilters)}
						className={`inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border cursor-pointer transition-colors ${hasActiveFilters ? "bg-primary text-white border-primary" : "bg-white border-gray-300 hover:bg-gray-50"}`}
					>
						<Filter className="h-4 w-4" />الفلاتر
						{hasActiveFilters && <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded-full">{Object.values(appliedFilters).filter(Boolean).length}</span>}
					</button>
				}
			/>

			{showFilters && (
				<form onSubmit={applyFilters} className="bg-white shadow-sm rounded-xl border border-gray-200 p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
					<div>
						<label className="block text-xs font-medium text-gray-500 mb-1">الإجراء</label>
						<select
							value={filters.action}
							onChange={(e) => setFilters({ ...filters, action: e.target.value })}
							className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary focus:border-primary cursor-pointer bg-white"
						>
							<option value="">كل الإجراءات</option>
							<option value="CREATE">إنشاء</option>
							<option value="UPDATE">تحديث</option>
							<option value="DELETE">حذف</option>
							<option value="LOGIN">تسجيل دخول</option>
							<option value="LOGOUT">تسجيل خروج</option>
							<option value="UPLOAD">رفع</option>
						</select>
					</div>
					<div>
						<label className="block text-xs font-medium text-gray-500 mb-1">نوع المحتوى</label>
						<select
							value={filters.resource_type}
							onChange={(e) => setFilters({ ...filters, resource_type: e.target.value })}
							className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary focus:border-primary cursor-pointer bg-white"
						>
							<option value="">كل الأنواع</option>
							<option value="post">مقالات</option>
							<option value="book">كتب</option>
							<option value="academic-paper">أبحاث</option>
							<option value="gallery">معرض</option>
							<option value="media">وسائط</option>
							<option value="user">مستخدمون</option>
							<option value="role">أدوار</option>
							<option value="contact">رسائل تواصل</option>
							<option value="newsletter">نشرة بريدية</option>
						</select>
					</div>
					<div>
						<label className="block text-xs font-medium text-gray-500 mb-1">من تاريخ</label>
						<input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary focus:border-primary cursor-pointer" />
					</div>
					<div>
						<label className="block text-xs font-medium text-gray-500 mb-1">إلى تاريخ</label>
						<input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary focus:border-primary cursor-pointer" />
					</div>
					<div className="col-span-2 md:col-span-4 flex gap-2">
						<button type="submit" className="px-4 py-2 bg-primary text-white text-sm rounded-md hover:bg-primary/90 cursor-pointer">تطبيق</button>
						<button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 px-4 py-2 border border-gray-300 text-sm rounded-md hover:bg-gray-50 cursor-pointer"><X className="h-3 w-3" />مسح</button>
					</div>
				</form>
			)}

			{loading ? (
				<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
					<ListSkeleton rows={8} />
				</div>
			) : logs.length === 0 ? (
				<EmptyState
					variant="card"
					icon={ClipboardList}
					title={hasActiveFilters ? "لا توجد نتائج" : "لا توجد سجلات بعد"}
					description={hasActiveFilters ? "جرّب تعديل الفلاتر أو مسحها لعرض كل السجلات." : "تظهر هنا تلقائياً كل النشاطات والتغييرات التي يقوم بها المستخدمون."}
					action={hasActiveFilters && (
						<button onClick={clearFilters} className="inline-flex items-center gap-1 px-4 py-2 bg-primary text-white text-sm rounded-md hover:bg-primary/90 cursor-pointer"><X className="h-3 w-3" />مسح الفلاتر</button>
					)}
				/>
			) : (
				<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
					<div className="divide-y divide-gray-100">
						{logs.map((log) => {
							const style = actionStyle(log.action)
							const ActionIcon = style.icon
							const isExp = expanded === log.id
							const hasChanges = log.changes && Object.keys(log.changes).length > 0
							const action = humanizeAuditAction(log.action)
							const resourceLabel = humanizeResource(log.resource_type)
							const resourceTitle = pickResourceTitle(log)
							const username = log.users?.username || "النظام"

							return (
								<div key={log.id} className="px-5 py-4 hover:bg-gray-50/60 transition-colors">
									<div className="flex items-start gap-3">
										<div className={`shrink-0 w-9 h-9 rounded-full ${style.color} flex items-center justify-center mt-0.5`}>
											<ActionIcon className="h-4 w-4" />
										</div>

										<div className="flex-1 min-w-0">
											<div className="flex items-baseline gap-2 flex-wrap">
												<span className="text-sm text-gray-900">
													<span className="font-medium">{username}</span>
													<span className="text-gray-500 mx-1">{action.verb || "نفّذ"}</span>
													<span className="font-medium text-primary">{resourceLabel}</span>
												</span>
												{resourceTitle && (
													<span className="text-sm text-gray-700 truncate">«{resourceTitle}»</span>
												)}
											</div>
											<div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
												<span>{safeFormat(log.created_at, "dd/MM/yyyy — HH:mm")}</span>
												{(hasChanges || log.ip_address) && (
													<button onClick={() => setExpanded(isExp ? null : log.id)} className="hover:text-primary flex items-center gap-1 cursor-pointer">
														{isExp ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
														{isExp ? "أخفِ التفاصيل" : "تفاصيل تقنية"}
													</button>
												)}
											</div>
											{isExp && (
												<div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
													{log.ip_address && (
														<div>
															<span className="text-gray-500">عنوان IP: </span>
															<span className="font-mono text-gray-800">{log.ip_address}</span>
														</div>
													)}
													{log.user_agent && (
														<div className="md:col-span-2">
															<span className="text-gray-500">المتصفّح: </span>
															<span className="font-mono text-gray-800 text-[11px]">{log.user_agent}</span>
														</div>
													)}
													{hasChanges && (
														<div className="md:col-span-2">
															<span className="text-gray-500 block mb-1">البيانات المُسجَّلة:</span>
															<pre className="p-3 bg-gray-900 text-gray-100 rounded-md overflow-x-auto text-[11px] leading-5" dir="ltr">
																{JSON.stringify(log.changes, null, 2)}
															</pre>
														</div>
													)}
												</div>
											)}
										</div>
									</div>
								</div>
							)
						})}
					</div>
				</div>
			)}

			<Pagination page={page} pages={pages} total={total} limit={limit} onPage={setPage} onLimit={onLimitChange} pageSizes={[30, 50, 100]} />
		</div>
	)
}
