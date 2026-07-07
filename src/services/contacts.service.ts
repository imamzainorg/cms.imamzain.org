import { api } from "@/lib/api"
import type { Contact, PaginatedResponse } from "@/types"

export const contactsService = {
	list: (params?: {
		page?: number
		limit?: number
		status?: "NEW" | "RESPONDED" | "SPAM"
	}) => api.get<PaginatedResponse<Contact>>("/forms/contacts", { params }),

	update: (id: string, body: { status: "NEW" | "RESPONDED" | "SPAM"; responded_at?: string }) =>
		api.patch<Contact>(`/forms/contacts/${id}`, body),

	remove: (id: string) => api.delete(`/forms/contacts/${id}`),

	trash: (params?: { page?: number; limit?: number }) =>
		api.get<PaginatedResponse<Contact>>("/forms/contacts/trash", { params }),

	restore: (id: string) => api.post<Contact>(`/forms/contacts/${id}/restore`),
}
