"use client"

import { useEffect, useState } from "react"
import { contactsService } from "@/services/contacts.service"
import type { Contact } from "@/types"
import { toast } from "sonner"
import { format } from "date-fns"
import { Loader2, Mail, CheckCircle, XCircle, AlertCircle } from "lucide-react"

export default function ContactsPage() {
	const [contacts, setContacts] = useState<Contact[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [selected, setSelected] = useState<Contact | null>(null)
	const [statusFilter, setStatusFilter] = useState<"" | "NEW" | "RESPONDED" | "SPAM">("")
	const [notes, setNotes] = useState("")

	useEffect(() => { loadContacts() }, [statusFilter])

	const loadContacts = async () => {
		setIsLoading(true)
		try {
			const { data } = await contactsService.list({ status: statusFilter || undefined })
			setContacts(data.contacts)
		} catch { toast.error("Failed to load contacts") }
		finally { setIsLoading(false) }
	}

	const updateStatus = async (id: string, status: Contact["status"]) => {
		try {
			await contactsService.update(id, { status, notes: notes || undefined })
			toast.success("Status updated")
			setNotes("")
			setSelected(null)
			loadContacts()
		} catch { toast.error("Failed to update status") }
	}

	const statusIcon = (s: Contact["status"]) => ({
		NEW: <AlertCircle className="h-4 w-4 text-blue-600" />,
		RESPONDED: <CheckCircle className="h-4 w-4 text-green-600" />,
		SPAM: <XCircle className="h-4 w-4 text-red-600" />,
	}[s])

	const statusClass = (s: Contact["status"]) => ({
		NEW: "bg-blue-100 text-blue-800",
		RESPONDED: "bg-green-100 text-green-800",
		SPAM: "bg-red-100 text-red-800",
	}[s])

	if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

	return (
		<div>
			<h1 className="text-3xl font-bold text-gray-900 mb-6">Contact Submissions</h1>

			<div className="flex gap-2 mb-4">
				{(["", "NEW", "RESPONDED", "SPAM"] as const).map((f) => (
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
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{contacts.length === 0 ? (
								<tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500"><Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" /><p>No contacts found</p></td></tr>
							) : contacts.map((c) => (
								<tr key={c.id} onClick={() => { setSelected(c); setNotes("") }} className="cursor-pointer hover:bg-gray-50">
									<td className="px-6 py-4 text-sm font-medium text-gray-900">{c.name}</td>
									<td className="px-6 py-4 text-sm text-gray-500">{c.email}</td>
									<td className="px-6 py-4">
										<span className={`px-2 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full ${statusClass(c.status)}`}>
											{statusIcon(c.status)}{c.status}
										</span>
									</td>
									<td className="px-6 py-4 text-sm text-gray-500">{format(new Date(c.submitted_at), "MMM d, yyyy")}</td>
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
						{selected.country && <div><label className="text-sm font-medium text-gray-500">Country</label><p className="mt-1 text-sm text-gray-900">{selected.country}</p></div>}
						<div><label className="text-sm font-medium text-gray-500">Message</label><p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selected.message}</p></div>
						<div>
							<label className="text-sm font-medium text-gray-500">Notes</label>
							<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional notes..." className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary focus:border-primary" />
						</div>
						<div className="space-y-2 pt-2">
							{selected.status !== "RESPONDED" && (
								<button onClick={() => updateStatus(selected.id, "RESPONDED")} className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Mark as Responded</button>
							)}
							{selected.status !== "SPAM" && (
								<button onClick={() => updateStatus(selected.id, "SPAM")} className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Mark as Spam</button>
							)}
							{selected.status !== "NEW" && (
								<button onClick={() => updateStatus(selected.id, "NEW")} className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">Reset to New</button>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	)
}