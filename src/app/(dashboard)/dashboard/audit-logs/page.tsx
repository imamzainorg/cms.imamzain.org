"use client"

import { useEffect, useState } from "react"
import { auditLogsService } from "@/services/audit-logs.service"
import type { AuditLog } from "@/types"
import { toast } from "sonner"
import { Loader2, ClipboardList } from "lucide-react"
import { format } from "date-fns"

export default function AuditLogsPage() {
	const [logs, setLogs] = useState<AuditLog[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [page, setPage] = useState(1)
	const [total, setTotal] = useState(0)
	const [filters, setFilters] = useState({ action: "", resource_type: "", from: "", to: "" })

	useEffect(() => { loadLogs() }, [page])

	const loadLogs = async () => {
		setIsLoading(true)
		try {
			const params = { page, limit: 20, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) }
			const { data } = await auditLogsService.list(params)
			setLogs(data.items ?? [])
			setTotal(data.pagination?.total ?? 0)
		} catch { toast.error("فشل تحميل سجلات التدقيق") }
		finally { setIsLoading(false) }
	}

	const handleFilterSubmit = (e: React.FormEvent) => { e.preventDefault(); setPage(1); loadLogs() }

	if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

	return (
		<div>
			<h1 className="text-3xl font-bold text-gray-900 mb-6">سجلات التدقيق</h1>

			<form onSubmit={handleFilterSubmit} className="bg-white shadow-sm rounded-lg p-4 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
				<div>
					<label className="block text-xs font-medium text-gray-500 mb-1">الإجراء</label>
					<input value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })} placeholder="مثال: POST_CREATED" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary focus:border-primary" />
				</div>
				<div>
					<label className="block text-xs font-medium text-gray-500 mb-1">نوع المورد</label>
					<input value={filters.resource_type} onChange={(e) => setFilters({ ...filters, resource_type: e.target.value })} placeholder="مثال: post" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary focus:border-primary" />
				</div>
				<div>
					<label className="block text-xs font-medium text-gray-500 mb-1">من</label>
					<input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary focus:border-primary" />
				</div>
				<div>
					<label className="block text-xs font-medium text-gray-500 mb-1">إلى</label>
					<input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary focus:border-primary" />
				</div>
				<div className="col-span-2 md:col-span-4 flex gap-2">
					<button type="submit" className="px-4 py-2 bg-primary text-white text-sm rounded-md hover:bg-primary/90">تطبيق الفلاتر</button>
					<button type="button" onClick={() => { setFilters({ action: "", resource_type: "", from: "", to: "" }); setTimeout(() => loadLogs(), 0) }} className="px-4 py-2 border border-gray-300 text-sm rounded-md hover:bg-gray-50">مسح</button>
				</div>
			</form>

			<div className="bg-white shadow-sm rounded-lg overflow-hidden">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراء</th>
							<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المورد</th>
							<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المستخدم</th>
							<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{logs.length === 0 ? (
							<tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500"><ClipboardList className="h-12 w-12 mx-auto mb-4 text-gray-300" /><p>لا توجد سجلات</p></td></tr>
						) : logs.map((log) => (
							<tr key={log.id} className="hover:bg-gray-50">
								<td className="px-6 py-4"><span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-mono rounded">{log.action}</span></td>
								<td className="px-6 py-4 text-sm text-gray-700">
									<span className="font-medium">{log.resource_type}</span>
									{log.resource_id && <span className="mr-2 text-xs text-gray-400 font-mono truncate">{log.resource_id.slice(0, 8)}…</span>}
								</td>
								<td className="px-6 py-4 text-sm text-gray-500">{log.users?.username || "النظام"}</td>
								<td className="px-6 py-4 text-sm text-gray-500">{log.created_at ? format(new Date(log.created_at), "dd/MM/yyyy HH:mm") : "—"}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			{total > 20 && (
				<div className="mt-4 flex justify-between items-center">
					<p className="text-sm text-gray-500">عرض {logs.length} من {total}</p>
					<div className="flex gap-2">
						<button onClick={() => setPage(page-1)} disabled={page===1} className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-50">السابق</button>
						<button onClick={() => setPage(page+1)} disabled={logs.length<20} className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-50">التالي</button>
					</div>
				</div>
			)}
		</div>
	)
}
