import { api } from "@/lib/api"
import type { PaginatedResponse, StaticPage } from "@/types"

type TranslationInput = {
	lang: string
	title: string
	slug: string
	body: string
	is_default?: boolean
	meta_title?: string
	meta_description?: string
	og_image_id?: string | null
}

export const staticPagesService = {
	/** Admin list — includes drafts. Public GET /static-pages returns published only. */
	list: (params?: { page?: number; limit?: number; is_published?: boolean }) =>
		api.get<PaginatedResponse<StaticPage>>("/static-pages/admin", { params }),

	/** Admin detail — public GET /static-pages/:id 404s on drafts, so always use this. */
	get: (id: string) => api.get<StaticPage>(`/static-pages/admin/${id}`),

	create: (body: {
		translations: TranslationInput[]
		display_order?: number
		is_published?: boolean
	}) => api.post<StaticPage>("/static-pages", body),

	/** Translations are upserted by (page_id, lang) — omitted langs are left untouched. */
	update: (id: string, body: Partial<{
		translations: TranslationInput[]
		display_order: number
		is_published: boolean
	}>) => api.patch<StaticPage>(`/static-pages/${id}`, body),

	togglePublish: (id: string, is_published: boolean) =>
		api.patch<StaticPage>(`/static-pages/${id}/publish`, { is_published }),

	remove: (id: string) => api.delete(`/static-pages/${id}`),

	// Soft-delete trash + restore (restore 409s if a live page claimed a slug meanwhile)
	trash: (params?: { page?: number; limit?: number }) =>
		api.get<PaginatedResponse<StaticPage>>("/static-pages/trash", { params }),

	restore: (id: string) => api.post<StaticPage>(`/static-pages/${id}/restore`),
}
