"use client"

import { useEffect, useState } from "react"
import { newsletterService } from "@/services/newsletter.service"
import type { Subscriber } from "@/types"
import { toast } from "sonner"
import { format } from "date-fns"
import { Download, Mail, Users, UserCheck, UserX, Loader2, Trash2 } from "lucide-react"

export default function NewsletterPage() {
	const [subscribers, setSubscribers] = useState<Subscriber[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [filter, setFilter] = useState<"all" | "active" | "inactive">("all")
	const [page, setPage] = useState(1)
	const [total, setTotal] = useState(0)

	useEffect(() => { loadSubscribers() }, [page])

	const loadSubscribers = async () => {
		setIsLoading(true)
		try {
			const { data } = await newsletterService.list({ page, limit: 50 })
			setSubscribers(data.subscribers)
			setTotal(data.total)
		} catch { toast.error("Failed to load subscribers") }
		finally { setIsLoading(false) }
	}

	const filtered = subscribers.filter((s) => filter === "all" ? true : filter === "active" ? s.is_active : !s.is_active)

	const stats = {
		total: subscribers.length,
		active: subscribers.filter((s) => s.is_active).length,
		inactive: subscribers.filter((s) => !s.is_active).length,
	}

	const toggleStatus = async (subscriber: Subscriber) => {
		try {
			if (subscriber.is_active) {
				await newsletterService.unsubscribe(subscriber.email)
				toast.success("Subscriber deactivated")
			} else {
				await newsletterService.subscribe(subscriber.email)
				toast.success("Subscriber reactivated")
			}
			loadSubscribers()
		} catch { toast.error("Failed to update subscriber") }
	}

	const handleDelete = async (id: string) => {
		if (!confirm("Permanently delete this subscriber record?")) return
		try { await newsletterService.remove(id); toast.success("Deleted"); loadSubscribers() }
		catch { toast.error("Failed to delete subscriber") }
	}

	const exportCSV = () => {
		const csv = [
			["Email", "Status", "Subscribed At"].join(","),
			...filtered.map((s) => [s.email, s.is_active ? "Active" : "Inactive", new Date(s.subscribed_at).toISOString()].join(",")),
		].join("\n")
		const a = document.createElement("a")
		a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
		a.download = `subscribers-${format(new Date(), "yyyy-MM-dd")}.csv`
		a.click()
	}

	if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

	return (
		<div>
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-3xl font-bold text-gray-900">Newsletter Subscribers</h1>
				<button onClick={exportCSV} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90">
					<Download className="h-4 w-4" />Export CSV
				</button>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
				{[{ label: "Total", value: stats.total, icon: Users, color: "text-gray-400" },
					{ label: "Active", value: stats.active, icon: UserCheck, color: "text-green-400" },
					{ label: "Inactive", value: stats.inactive, icon: UserX, color: "text-red-400" }].map(({ label, value, icon: Icon, color }) => (
					<div key={label} className="bg-white shadow rounded-lg p-5 flex items-center gap-4">
						<Icon className={`h-6 w-6 ${color}`} />
						<div><p className="text-sm text-gray-500">{label}</p><p className="text-2xl font-semibold text-gray-900">{value}</p></div>
					</div>
				))}
			</div>

			<div className="flex gap-2 mb-4">
				{(["all", "active", "inactive"] as const).map((f) => (
					<button key={f} onClick={() => setFilter(f)}
						className={`px-4 py-2 text-sm font-medium rounded-md ${filter === f ? "bg-primary text-white" : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"}`}>
						{f.charAt(0).toUpperCase() + f.slice(1)}
					</button>
				))}
			</div>

			<div className="bg-white shadow-sm rounded-lg overflow-hidden">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subscribed</th>
							<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{filtered.length === 0 ? (
							<tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500"><Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" /><p>No subscribers found</p></td></tr>
						) : filtered.map((s) => (
							<tr key={s.id}>
								<td className="px-6 py-4 text-sm font-medium text-gray-900">{s.email}</td>
								<td className="px-6 py-4">
									<span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${s.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
										{s.is_active ? "Active" : "Inactive"}
									</span>
								</td>
								<td className="px-6 py-4 text-sm text-gray-500">{format(new Date(s.subscribed_at), "MMM d, yyyy")}</td>
								<td className="px-6 py-4 text-right text-sm font-medium flex justify-end items-center gap-3">
									<button onClick={() => toggleStatus(s)} className={`text-sm font-medium ${s.is_active ? "text-red-600 hover:text-red-900" : "text-green-600 hover:text-green-900"}`}>
										{s.is_active ? "Deactivate" : "Activate"}
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
					<button onClick={() => setPage(page-1)} disabled={page===1} className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-50">Previous</button>
					<button onClick={() => setPage(page+1)} disabled={subscribers.length<50} className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-50">Next</button>
				</div>
			)}
		</div>
	)
}