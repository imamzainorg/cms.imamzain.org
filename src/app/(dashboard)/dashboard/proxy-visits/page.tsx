"use client"

import { useState } from "react"
import type { ProxyVisit } from "@/types"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api"
import { safeFormat } from "@/lib/dates"
import { Loader2, Users, CheckCircle, XCircle, Clock } from "lucide-react"
import { TableSkeleton } from "@/components/ui/Skeleton"
import {
	useProxyVisitsList,
	useUpdateProxyVisit,
} from "@/lib/queries/proxy-visits"

export default function ProxyVisitsPage() {
	const [selected, setSelected] = useState<ProxyVisit | null>(null)
	const [statusFilter, setStatusFilter] = useState<
		"" | "PENDING" | "APPROVED" | "COMPLETED" | "REJECTED"
	>("")

	const listQuery = useProxyVisitsList({ status: statusFilter || undefined })
	const rawVisits = listQuery.data?.items ?? []
	// `keepPreviousData` from the query layer keeps the previous filter's rows on
	// screen while the new filter's query is in flight. Without this client-side
	// refilter the user briefly sees "All" rows leak into the "PENDING" tab
	// before the new response arrives.
	const visits = statusFilter
		? rawVisits.filter((v) => v.status === statusFilter)
		: rawVisits
	const isLoading = listQuery.isLoading
	const isFetching = listQuery.isFetching

	const updateVisit = useUpdateProxyVisit()

	const updateStatus = (id: string, status: ProxyVisit["status"]) => {
		updateVisit.mutate(
			{ id, body: { status } },
			{
				onSuccess: () => {
					toast.success("تم تحديث الحالة")
					setSelected(null)
				},
				onError: (e) =>
					toast.error(getErrorMessage(e, "فشل تحديث الحالة")),
			},
		)
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

	const emptyLabel = statusFilter
		? `لا توجد طلبات بحالة "${filterLabels[statusFilter]}"`
		: "لا توجد طلبات"

	return (
		<div>
			<h1 className="text-3xl font-bold text-gray-900 mb-6">
				طلبات الزيارة بالإنابة
			</h1>

			<div className="flex gap-2 mb-4 flex-wrap items-center">
				{(
					[
						"",
						"PENDING",
						"APPROVED",
						"COMPLETED",
						"REJECTED",
					] as const
				).map((f) => (
					<button
						key={f}
						onClick={() => {
							setStatusFilter(f)
							setSelected(null)
						}}
						className={`px-3 py-1.5 text-sm font-medium rounded-md cursor-pointer ${statusFilter === f ? "bg-primary text-white" : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"}`}
					>
						{filterLabels[f]}
					</button>
				))}
				{isFetching && !isLoading && (
					<Loader2
						className="h-4 w-4 animate-spin text-primary"
						aria-label="جارٍ التحميل"
					/>
				)}
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
										className="cursor-pointer hover:bg-gray-50"
									>
										<td className="px-6 py-4 text-sm font-medium text-gray-900">
											{v.name}
										</td>
										<td className="px-6 py-4 text-sm text-gray-500">
											{v.phone || "—"}
										</td>
										<td className="px-6 py-4 text-sm text-gray-500">
											{v.country || "—"}
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

				{selected && (
					<div className="bg-white shadow-sm rounded-lg p-6 space-y-4">
						<h3 className="text-lg font-medium text-gray-900">
							التفاصيل
						</h3>
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
									{selected.country}
								</p>
							</div>
						)}
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
							{selected.status === "APPROVED" && (
								<button
									onClick={() =>
										updateStatus(selected.id, "COMPLETED")
									}
									className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
								>
									تحديد كـ &quot;مكتمل&quot;
								</button>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
