import { api } from "@/lib/api"
import type {
	DailyHadith,
	DailyHadithToday,
	DailyHadithPin,
	PaginatedResponse,
} from "@/types"

type TranslationInput = {
	lang: string
	content: string
	source?: string
	is_default: boolean
}

export const dailyHadithsService = {
	today: () => api.get<DailyHadithToday>("/daily-hadiths/today"),

	list: (params?: { page?: number; limit?: number }) =>
		api.get<PaginatedResponse<DailyHadith>>("/daily-hadiths", { params }),

	get: (id: string) => api.get<DailyHadith>(`/daily-hadiths/${id}`),

	create: (body: {
		display_order?: number
		is_active?: boolean
		translations: TranslationInput[]
	}) => api.post<DailyHadith>("/daily-hadiths", body),

	update: (id: string, body: Partial<{
		display_order: number
		is_active: boolean
		translations: TranslationInput[]
	}>) => api.patch<DailyHadith>(`/daily-hadiths/${id}`, body),

	remove: (id: string) => api.delete(`/daily-hadiths/${id}`),

	listPins: () => api.get<DailyHadithPin[]>("/daily-hadiths/pins"),

	pin: (body: { pin_date: string; hadith_id: string }) =>
		api.post<DailyHadithPin>("/daily-hadiths/pins", body),

	unpin: (pin_date: string) => api.delete(`/daily-hadiths/pins/${pin_date}`),
}
