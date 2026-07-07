import { api } from "@/lib/api"
import type { ProxyVisit, PaginatedResponse } from "@/types"

export const proxyVisitsService = {
	list: (params?: {
		page?: number
		limit?: number
		status?: "PENDING" | "APPROVED" | "COMPLETED" | "REJECTED"
	}) => api.get<PaginatedResponse<ProxyVisit>>("/forms/proxy-visits", { params }),

	update: (id: string, body: {
		status: "PENDING" | "APPROVED" | "COMPLETED" | "REJECTED"
		processed_at?: string
	}) => api.patch<ProxyVisit>(`/forms/proxy-visits/${id}`, body),

	remove: (id: string) => api.delete(`/forms/proxy-visits/${id}`),

	trash: (params?: { page?: number; limit?: number }) =>
		api.get<PaginatedResponse<ProxyVisit>>("/forms/proxy-visits/trash", { params }),

	restore: (id: string) => api.post<ProxyVisit>(`/forms/proxy-visits/${id}/restore`),
}
