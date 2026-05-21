"use client"

import { useResourceAuditHistory } from "@/lib/queries/audit-logs"
import { humanizeAuditAction, humanizeResource } from "@/lib/humanize"
import { safeFormat } from "@/lib/dates"
import { Activity, Clock, Loader2 } from "lucide-react"

type Props = {
	resource_type: string
	resource_id: string | undefined
	title?: string
}

/**
 * Compact activity feed for a single record. Drops onto post / book / paper /
 * gallery detail pages so editors see the chain of edits/publishes/restores.
 * Calls `GET /audit-logs?resource_type=&resource_id=` (added in API round 2b).
 */
export default function AuditPanel({ resource_type, resource_id, title = "النشاط الأخير" }: Props) {
	const query = useResourceAuditHistory(resource_type, resource_id)
	const items = query.data?.items ?? []

	if (!resource_id) return null

	return (
		<div className="bg-white shadow-sm rounded-xl border border-gray-200 p-5">
			<div className="flex items-center gap-2 mb-3">
				<Activity className="h-4 w-4 text-gray-400" />
				<h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h3>
			</div>

			{query.isLoading ? (
				<div className="flex justify-center py-4">
					<Loader2 className="h-5 w-5 animate-spin text-primary" />
				</div>
			) : items.length === 0 ? (
				<p className="text-xs text-gray-500 text-center py-3">لا توجد أحداث بعد.</p>
			) : (
				<ul className="space-y-2.5 max-h-96 overflow-y-auto">
					{items.map((log) => {
						const action = humanizeAuditAction(log.action)
						const resource = humanizeResource(log.resource_type)
						const username = log.users?.username || "النظام"
						const isCron = (log.changes as { by?: string } | null)?.by === "cron"
						const isBulk = (log.changes as { bulk?: boolean } | null)?.bulk === true
						return (
							<li key={log.id} className="flex items-start gap-3 text-xs">
								<div className="w-1.5 h-1.5 rounded-full bg-primary/40 mt-1.5 shrink-0" />
								<div className="flex-1 min-w-0">
									<p className="text-gray-900">
										<span className="font-medium">{username}</span>
										<span className="text-gray-500 mx-1">{action.verb || "نفّذ"}</span>
										<span className="text-gray-700">{resource}</span>
										{isBulk && <span className="mr-1 text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">مجمّع</span>}
										{isCron && <span className="mr-1 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">مجدول</span>}
									</p>
									<p className="text-gray-400 text-[11px] mt-0.5 flex items-center gap-1">
										<Clock className="h-2.5 w-2.5" />
										{safeFormat(log.created_at, "dd/MM/yyyy — HH:mm")}
									</p>
								</div>
							</li>
						)
					})}
				</ul>
			)}
		</div>
	)
}
