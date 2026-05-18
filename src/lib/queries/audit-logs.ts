import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { auditLogsService } from "@/services/audit-logs.service"
import { queryKeys } from "./keys"

type ListParams = {
	page?: number
	limit?: number
	user_id?: string
	action?: string
	resource_type?: string
	resource_id?: string
	from?: string
	to?: string
}

export function useAuditLogsList(params: ListParams) {
	return useQuery({
		queryKey: queryKeys.auditLogs.list(params),
		queryFn: async () => (await auditLogsService.list(params)).data,
		placeholderData: keepPreviousData,
	})
}

/** History feed for one specific resource — drop into detail pages. */
export function useResourceAuditHistory(resource_type: string, resource_id: string | undefined) {
	return useQuery({
		queryKey: queryKeys.auditLogs.list({ resource_type, resource_id, limit: 20 }),
		queryFn: async () => (await auditLogsService.list({ resource_type, resource_id, limit: 20 })).data,
		enabled: !!resource_id,
	})
}
