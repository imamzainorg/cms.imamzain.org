import { api } from "@/lib/api"
import type { PaginatedResponse, Speaker } from "@/types"

type SpeakerTranslationInput = {
	lang: string
	name: string
	is_default: boolean
}

export const speakersService = {
	// Public endpoint — items carry `audio_count` (live published audios).
	list: (params?: { page?: number; limit?: number; search?: string }) =>
		api.get<PaginatedResponse<Speaker>>("/speakers", { params }),

	get: (id: string) => api.get<Speaker>(`/speakers/${id}`),

	create: (body: { translations: SpeakerTranslationInput[] }) =>
		api.post<Speaker>("/speakers", body),

	update: (id: string, body: { translations?: SpeakerTranslationInput[] }) =>
		api.patch<Speaker>(`/speakers/${id}`, body),

	// 409 while live audios still reference the speaker — surface server message.
	remove: (id: string) => api.delete(`/speakers/${id}`),

	trash: (params?: { page?: number; limit?: number }) =>
		api.get<PaginatedResponse<Speaker>>("/speakers/trash", { params }),

	restore: (id: string) => api.post<Speaker>(`/speakers/${id}/restore`),
}
