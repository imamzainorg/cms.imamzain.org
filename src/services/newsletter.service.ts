import { api } from "@/lib/api"
import type { Subscriber } from "@/types"

export const newsletterService = {
	list: (params?: { page?: number; limit?: number }) =>
		api.get<{ subscribers: Subscriber[]; total: number }>("/newsletter/subscribers", { params }),

	subscribe: (email: string) => api.post("/newsletter/subscribe", { email }),

	unsubscribe: (email: string) => api.post("/newsletter/unsubscribe", { email }),

	remove: (id: string) => api.delete(`/newsletter/subscribers/${id}`),
}