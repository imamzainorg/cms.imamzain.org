import { api } from "@/lib/api"
import type { Language } from "@/types"

export const languagesService = {
	list: () => api.get<Language[]>("/languages"),

	listAll: () => api.get<Language[]>("/languages/all"),

	create: (code: string) => api.post<Language>("/languages", { code }),

	update: (code: string, body: { is_active?: boolean }) =>
		api.patch<Language>(`/languages/${code}`, body),

	remove: (code: string) => api.delete(`/languages/${code}`),
}
