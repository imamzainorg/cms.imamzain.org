import { api } from "@/lib/api"
import type { GalleryImage, PaginatedResponse } from "@/types"

type GalleryTranslationInput = {
	lang: string
	title?: string
	description?: string
	meta_title?: string
	meta_description?: string
	og_image_id?: string | null
}

export const galleryService = {
	// Admin route — surfaces drafts too. The public GET /gallery silently
	// hides unpublished images.
	// NOTE: GalleryQueryDto has no is_published filter (forbidNonWhitelisted
	// would 400 it) — /gallery/admin always returns drafts + published together.
	list: (params?: {
		page?: number
		limit?: number
		category_id?: string
		tags?: string[]
		locations?: string[]
	}) => api.get<PaginatedResponse<GalleryImage>>("/gallery/admin", { params }),

	// Admin detail — the public GET /gallery/:id 404s on drafts.
	get: (id: string) => api.get<GalleryImage>(`/gallery/admin/${id}`),

	create: (body: {
		media_id: string
		category_id?: string
		taken_at?: string
		author?: string
		tags?: string[]
		locations?: string[]
		is_published?: boolean
		translations?: GalleryTranslationInput[]
	}) => api.post<GalleryImage>("/gallery", body),

	update: (id: string, body: Partial<{
		media_id: string
		// null disconnects the category (PATCH: undefined = leave unchanged)
		category_id: string | null
		// null clears (PATCH: undefined = leave unchanged)
		taken_at: string | null
		author: string | null
		tags: string[]
		locations: string[]
		is_published: boolean
		translations: GalleryTranslationInput[]
	}>) => api.patch<GalleryImage>(`/gallery/${id}`, body),

	togglePublish: (id: string, is_published: boolean) =>
		api.patch<GalleryImage>(`/gallery/${id}/publish`, { is_published }),

	remove: (id: string) => api.delete(`/gallery/${id}`),

	trash: (params?: { page?: number; limit?: number }) =>
		api.get<PaginatedResponse<GalleryImage>>("/gallery/trash", { params }),

	restore: (id: string) => api.post<GalleryImage>(`/gallery/${id}/restore`),
}
