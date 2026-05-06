"use client"

import { useEffect, useState } from "react"
import { newsletterService } from "@/services/newsletter.service"
import type { Subscriber } from "@/types"
import { toast } from "sonner"
import { format } from "date-fns"
import { Download, Mail, Users, UserCheck, UserX, Loader2, Trash2, Search } from "lucide-react"

type ActiveFilter = "all" | "active" | "inactive"

export default function NewsletterPage() {
	const [subscribers, setSubscribers] = useState<Subscriber[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [filter, setFilter] = useState<ActiveFilter>("all")
	const [search, setSearch] = useState("")
	const [page, setPage] = useState(1)
	const [total, setTotal] = useState(0)

	useEffect(() => {
		setPage(1)
	}, [filter, search])

	useEffect(() => {
		loadSubscribers()
	}, [filter, search, page])

	const loadSubscribers = async () => {
		setIsLoading(true)
		try {
			const searchParam = search.trim() || undefined
			if (filter === "all") {
				const [activeRes, inactiveRes] = await Promise.all([
					newsletterService.list({ page, limit: 25, is_active: true, search: searchParam }),
					newsletterService.list({ page, limit: 25, is_active: false, search: searchParam }),
				])
				setSubscribers([...(activeRes.data.items ?? []), ...(inactiveRes.data.items ?? [])])
				setTotal((activeRes.data.pagination?.total ?? 0) + (inactiveRes.data.pagination?.total ?? 0))
			} else {
				const params: { page: number; limit: number; is_active?: boolean; search?: string } = { page, limit: 50 }
				if (filter === "active") params.is_active = true
				if (filter === "inactive") params.is_active = false
				if (searchParam) params.search = searchParam
				const { data } = await newsletterService.list(params)
				setSubscribers(data.items ?? [])
				setTotal(data.pagination?.total ?? 0)
			}
		} catch { toast.error("فشل تحميل المشتركين") }
		finally { setIsLoading(false) }
	}

	const toggleStatus = async (subscriber: Subscriber) => {
		try {
			if (subscriber.is_active) {
				await newsletterService.unsubscribe(subscriber.email)
				toast.success("تم تعطيل المشترك")
			} else {
				await newsletterService.subscribe(subscriber.email)
				toast.success("تم تفعيل المشترك")
			}
			setSubscribers((prev) =>
				prev.map((s) => (s.id === subscriber.id ? { ...s, is_active: !s.is_active } : s))
			)
		} catch { toast.error("فشل تحديث بيانات المشترك") }
	}

	const handleDelete = async (id: string) => {
		if (!confirm("هل تريد حذف هذا المشترك نهائياً؟")) return
		try { await newsletterService.remove(id); toast.success("تم الحذف"); loadSubscribers() }
		catch { toast.error("فشل حذف المشترك") }
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

	const filterLabels: Record<ActiveFilter, string> = { all: "الكل", active: "النشطون", inactive: "غير النشطين" }
	const activeCount = filter === "all" ? undefined : subscribers.filter((s) => s.is_active).length
	const inactiveCount = filter === "all" ? undefined : subscribers.filter((s) => !s.is_active).length

	return (
		<div>
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-3xl font-bold text-gray-900">النشرة البريدية</h1>
				<button onClick={exportCSV} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90">
					<Download className="h-4 w-4" />تصدير CSV
				</button>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
				{[
					{ label: "الإجمالي", value: total, icon: Users, color: "text-gray-400" },
					{ label: "النشطون", value: activeCount, icon: UserCheck, color: "text-green-400" },
					{ label: "غير النشطين", value: inactiveCount, icon: UserX, color: "text-red-400" },
				].map(({ label, value, icon: Icon, color }) => (
					<div key={label} className="bg-white shadow rounded-lg p-5 flex items-center gap-4">
						<Icon className={`h-6 w-6 ${color}`} />
						<div><p className="text-sm text-gray-500">{label}</p><p className="text-2xl font-semibold text-gray-900">{value ?? total}</p></div>
					</div>
				))}
			</div>

			<div className="flex flex-col sm:flex-row gap-3 mb-4">
				<div className="flex gap-2">
					{(["all", "active", "inactive"] as const).map((f) => (
						<button key={f} onClick={() => setFilter(f)}
							className={`px-4 py-2 text-sm font-medium rounded-md ${filter === f ? "bg-primary text-white" : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"}`}>
							{filterLabels[f]}
						</button>
					))}
				</div>
				<div className="relative flex-1 max-w-sm">
					<Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
					<input
						type="text"
						placeholder="ابحث بالبريد الإلكتروني..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="w-full pr-9 pl-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
					/>
				</div>
			</div>

			<div className="bg-white shadow-sm rounded-lg overflow-hidden">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">البريد الإلكتروني</th>
							<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
							<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ الاشتراك</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{isLoading ? (
							<tr><td colSpan={4} className="px-6 py-12 text-center"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></td></tr>
						) : subscribers.length === 0 ? (
							<tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500"><Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" /><p>لا يوجد مشتركون</p></td></tr>
						) : subscribers.map((s) => (
							<tr key={s.id}>
								<td className="px-6 py-4 text-sm font-medium text-gray-900">{s.email}</td>
								<td className="px-6 py-4">
									<span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${s.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
										{s.is_active ? "نشط" : "غير نشط"}
									</span>
								</td>
								<td className="px-6 py-4 text-sm text-gray-500">{s.created_at ? format(new Date(s.created_at), "dd/MM/yyyy") : "—"}</td>
								<td className="px-6 py-4 text-left text-sm font-medium flex justify-end items-center gap-3">
									<button onClick={() => toggleStatus(s)} className={`text-sm font-medium ${s.is_active ? "text-red-600 hover:text-red-900" : "text-green-600 hover:text-green-900"}`}>
										{s.is_active ? "تعطيل" : "تفعيل"}
									</button>
									<button onClick={() => handleDelete(s.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			{total > 50 && (
				<div className="mt-4 flex justify-end gap-2">
					<button onClick={() => setPage(page - 1)} disabled={page === 1} className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-50">السابق</button>
					<button onClick={() => setPage(page + 1)} disabled={subscribers.length < 50} className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-50">التالي</button>
				</div>
			)}
		</div>
	)
}
