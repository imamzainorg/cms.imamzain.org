import { api } from "@/lib/api"
import type { Language } from "@/types"

export type CreateLanguageBody = {
	code: string
	name: string
	native_name: string
	is_active?: boolean
}

export type UpdateLanguageBody = {
	name?: string
	native_name?: string
	is_active?: boolean
}

export const languagesService = {
	list: () => api.get<Language[]>("/languages"),

	listAll: () => api.get<Language[]>("/languages/all"),

	create: (body: CreateLanguageBody) => api.post<Language>("/languages", body),

	update: (code: string, body: UpdateLanguageBody) =>
		api.patch<Language>(`/languages/${code}`, body),

	remove: (code: string) => api.delete(`/languages/${code}`),
}
