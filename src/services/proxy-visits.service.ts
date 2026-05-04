import { api } from "@/lib/api"
import type { ProxyVisit } from "@/types"

export const proxyVisitsService = {
	list: (params?: {
		page?: number
		limit?: number
		status?: "PENDING" | "APPROVED" | "COMPLETED" | "REJECTED"
	}) => api.get<{ visits: ProxyVisit[]; total: number }>("/forms/proxy-visits", { params }),

	update: (id: string, body: {
		status: "PENDING" | "APPROVED" | "COMPLETED" | "REJECTED"
		notes?: string
	}) => api.patch<ProxyVisit>(`/forms/proxy-visits/${id}`, body),

	remove: (id: string) => api.delete(`/forms/proxy-visits/${id}`),
}