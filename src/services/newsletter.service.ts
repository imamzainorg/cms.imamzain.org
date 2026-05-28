import { api } from "@/lib/api"
import type { Subscriber, PaginatedResponse } from "@/types"

export const newsletterService = {
	list: (params?: { page?: number; limit?: number; is_active?: boolean; search?: string }) =>
		api.get<PaginatedResponse<Subscriber>>("/newsletter/subscribers", { params }),

	unsubscribeById: (id: string) => api.post<Subscriber>(`/newsletter/subscribers/${id}/unsubscribe`),

	resubscribeById: (id: string) => api.post<Subscriber>(`/newsletter/subscribers/${id}/resubscribe`),

	remove: (id: string) => api.delete(`/newsletter/subscribers/${id}`),
}
