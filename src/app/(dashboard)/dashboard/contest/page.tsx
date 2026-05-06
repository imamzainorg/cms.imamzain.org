"use client"

import { useEffect, useState } from "react"
import { contestService } from "@/services/contest.service"
import type { ContestAttempt } from "@/types"
import { toast } from "sonner"
import { Loader2, Trophy } from "lucide-react"
import { format } from "date-fns"

export default function ContestPage() {
	const [attempts, setAttempts] = useState<ContestAttempt[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [page, setPage] = useState(1)
	const [total, setTotal] = useState(0)
	const [filter, setFilter] = useState<"" | "true" | "false">("")

	useEffect(() => { loadAttempts() }, [page, filter])

	const loadAttempts = async () => {
		setIsLoading(true)
		try {
			const { data } = await contestService.listAttempts({ page, limit: 20, submitted: filter || undefined })
			setAttempts(data.items ?? [])
			setTotal(data.pagination?.total ?? 0)
		} catch { toast.error("فشل تحميل محاولات المسابقة") }
		finally { setIsLoading(false) }
	}

	if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

	return (
		<div>
			<h1 className="text-3xl font-bold text-gray-900 mb-6">المسابقات</h1>

			<div className="flex gap-2 mb-4">
				{([["", "الكل"], ["true", "مُسلَّمة"], ["false", "قيد التقدم"]] as const).map(([val, label]) => (
					<button key={val} onClick={() => { setFilter(val); setPage(1) }}
						className={`px-3 py-1.5 text-sm font-medium rounded-md ${filter === val ? "bg-primary text-white" : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"}`}>
						{label}
					</button>
				))}
			</div>

			<div className="bg-white shadow-sm rounded-lg overflow-hidden">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاسم</th>
							<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الهاتف</th>
							<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الدرجة</th>
							<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
							<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ البدء</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{attempts.length === 0 ? (
							<tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500"><Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" /><p>لا توجد محاولات</p></td></tr>
						) : attempts.map((a) => (
							<tr key={a.id} className="hover:bg-gray-50">
								<td className="px-6 py-4 text-sm font-medium text-gray-900">{a.full_name}</td>
								<td className="px-6 py-4 text-sm text-gray-500">{a.phone || "—"}</td>
								<td className="px-6 py-4 text-sm text-gray-900">
									{a.is_submitted ? <span className="font-semibold">{a.score ?? 0}</span> : "—"}
								</td>
								<td className="px-6 py-4">
									<span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${a.is_submitted ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
										{a.is_submitted ? "مُسلَّمة" : "قيد التقدم"}
									</span>
								</td>
								<td className="px-6 py-4 text-sm text-gray-500">{a.created_at ? format(new Date(a.created_at), "dd/MM/yyyy HH:mm") : "—"}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			{total > 20 && (
				<div className="mt-4 flex justify-between items-center">
					<p className="text-sm text-gray-500">عرض {attempts.length} من {total}</p>
					<div className="flex gap-2">
						<button onClick={() => setPage(page - 1)} disabled={page === 1} className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-50">السابق</button>
						<button onClick={() => setPage(page + 1)} disabled={attempts.length < 20} className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-50">التالي</button>
					</div>
				</div>
			)}
		</div>
	)
}
