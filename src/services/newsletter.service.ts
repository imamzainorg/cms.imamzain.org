import { api } from "@/lib/api"
import type { Subscriber, PaginatedResponse } from "@/types"

export const newsletterService = {
	list: (params?: { page?: number; limit?: number; is_active?: boolean; search?: string }) =>
		api.get<PaginatedResponse<Subscriber>>("/newsletter/subscribers", { params }),

	subscribe: (email: string) => api.post("/newsletter/subscribe", { email }),

	unsubscribe: (email: string) => api.post("/newsletter/unsubscribe", { email }),

	remove: (id: string) => api.delete(`/newsletter/subscribers/${id}`),
}
