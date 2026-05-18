import { api } from "@/lib/api"
import type { AuditLog, PaginatedResponse } from "@/types"

export const auditLogsService = {
	list: (params?: {
		page?: number
		limit?: number
		user_id?: string
		action?: string
		resource_type?: string
		resource_id?: string
		from?: string
		to?: string
	}) => api.get<PaginatedResponse<AuditLog>>("/audit-logs", { params }),

	get: (id: string) => api.get<AuditLog>(`/audit-logs/${id}`),
}
