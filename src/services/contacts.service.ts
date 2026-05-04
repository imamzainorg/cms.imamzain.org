import { api } from "@/lib/api"
import type { Contact } from "@/types"

export const contactsService = {
	list: (params?: {
		page?: number
		limit?: number
		status?: "NEW" | "RESPONDED" | "SPAM"
	}) => api.get<{ contacts: Contact[]; total: number }>("/forms/contacts", { params }),

	update: (id: string, body: { status: "NEW" | "RESPONDED" | "SPAM"; notes?: string }) =>
		api.patch<Contact>(`/forms/contacts/${id}`, body),

	remove: (id: string) => api.delete(`/forms/contacts/${id}`),
}