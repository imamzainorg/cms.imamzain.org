import { api } from "@/lib/api"
import type { AuditLog } from "@/types"

export const auditLogsService = {
	list: (params?: {
		page?: number
		limit?: number
		user_id?: string
		action?: string
		resource_type?: string
		from?: string
		to?: string
	}) => api.get<{ logs: AuditLog[]; total: number }>("/audit-logs", { params }),
}