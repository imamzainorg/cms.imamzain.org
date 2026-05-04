"use client"

import { useEffect, useState } from "react"
import { proxyVisitsService } from "@/services/proxy-visits.service"
import type { ProxyVisit } from "@/types"
import { toast } from "sonner"
import { format } from "date-fns"
import { Loader2, Users, CheckCircle, XCircle, Clock } from "lucide-react"

export default function ProxyVisitsPage() {
	const [visits, setVisits] = useState<ProxyVisit[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [selected, setSelected] = useState<ProxyVisit | null>(null)
	const [statusFilter, setStatusFilter] = useState<"" | "PENDING" | "APPROVED" | "COMPLETED" | "REJECTED">("")
	const [notes, setNotes] = useState("")

	useEffect(() => { loadVisits() }, [statusFilter])

	const loadVisits = async () => {
		setIsLoading(true)
		try {
			const { data } = await proxyVisitsService.list({ status: statusFilter || undefined })
			setVisits(data.visits)
		} catch { toast.error("Failed to load proxy visits") }
		finally { setIsLoading(false) }
	}

	const updateStatus = async (id: string, status: ProxyVisit["status"]) => {
		try {
			await proxyVisitsService.update(id, { status, notes: notes || undefined })
			toast.success("Status updated")
			setNotes("")
			setSelected(null)
			loadVisits()
		} catch { toast.error("Failed to update status") }
	}

	const statusClass = (s: ProxyVisit["status"]) => ({ PENDING: "bg-yellow-100 text-yellow-800", APPROVED: "bg-blue-100 text-blue-800", COMPLETED: "bg-green-100 text-green-800", REJECTED: "bg-red-100 text-red-800" }[s])
	const statusIcon = (s: ProxyVisit["status"]) => ({ PENDING: <Clock className="h-4 w-4" />, APPROVED: <CheckCircle className="h-4 w-4" />, COMPLETED: <CheckCircle className="h-4 w-4" />, REJECTED: <XCircle className="h-4 w-4" /> }[s])

	if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

	return (
		<div>
			<h1 className="text-3xl font-bold text-gray-900 mb-6">Proxy Visit Requests</h1>

			<div className="flex gap-2 mb-4">
				{(["", "PENDING", "APPROVED", "COMPLETED", "REJECTED"] as const).map((f) => (
					<button key={f} onClick={() => setStatusFilter(f)}
						className={`px-3 py-1.5 text-sm font-medium rounded-md ${statusFilter === f ? "bg-primary text-white" : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"}`}>
						{f || "All"}
					</button>
				))}
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2 bg-white shadow-sm rounded-lg overflow-hidden">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Country</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{visits.length === 0 ? (
								<tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500"><Users className="h-12 w-12 mx-auto mb-4 text-gray-300" /><p>No requests found</p></td></tr>
							) : visits.map((v) => (
								<tr key={v.id} onClick={() => { setSelected(v); setNotes("") }} className="cursor-pointer hover:bg-gray-50">
									<td className="px-6 py-4 text-sm font-medium text-gray-900">{v.name}</td>
									<td className="px-6 py-4 text-sm text-gray-500">{v.email}</td>
									<td className="px-6 py-4 text-sm text-gray-500">{v.country || "—"}</td>
									<td className="px-6 py-4">
										<span className={`px-2 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full ${statusClass(v.status)}`}>
											{statusIcon(v.status)}{v.status}
										</span>
									</td>
									<td className="px-6 py-4 text-sm text-gray-500">{format(new Date(v.submitted_at), "MMM d, yyyy")}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				{selected && (
					<div className="bg-white shadow-sm rounded-lg p-6 space-y-4">
						<h3 className="text-lg font-medium text-gray-900">Details</h3>
						<div><label className="text-sm font-medium text-gray-500">Name</label><p className="mt-1 text-sm text-gray-900">{selected.name}</p></div>
						<div><label className="text-sm font-medium text-gray-500">Email</label><p className="mt-1 text-sm text-gray-900">{selected.email}</p></div>
						{selected.phone && <div><label className="text-sm font-medium text-gray-500">Phone</label><p className="mt-1 text-sm text-gray-900">{selected.phone}</p></div>}
						{selected.country && <div><label className="text-sm font-medium text-gray-500">Country</label><p className="mt-1 text-sm text-gray-900">{selected.country}</p></div>}
						{selected.notes && <div><label className="text-sm font-medium text-gray-500">Notes</label><p className="mt-1 text-sm text-gray-900">{selected.notes}</p></div>}
						<div>
							<label className="text-sm font-medium text-gray-500">Add Notes</label>
							<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary focus:border-primary" />
						</div>
						<div className="space-y-2 pt-2">
							{selected.status === "PENDING" && <>
								<button onClick={() => updateStatus(selected.id, "APPROVED")} className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Approve</button>
								<button onClick={() => updateStatus(selected.id, "REJECTED")} className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Reject</button>
							</>}
							{selected.status === "APPROVED" && (
								<button onClick={() => updateStatus(selected.id, "COMPLETED")} className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Mark Completed</button>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	)
}