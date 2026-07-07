import { api } from "@/lib/api"
import type { GalleryImage, PaginatedResponse } from "@/types"

export const galleryService = {
	list: (params?: {
		page?: number
		limit?: number
		category_id?: string
		tags?: string[]
		locations?: string[]
	}) => api.get<PaginatedResponse<GalleryImage>>("/gallery", { params }),

	get: (id: string) => api.get<GalleryImage>(`/gallery/${id}`),

	create: (body: {
		media_id: string
		category_id?: string
		taken_at?: string
		author?: string
		tags?: string[]
		locations?: string[]
		translations?: {
			lang: string
			title?: string
			description?: string
		}[]
	}) => api.post<GalleryImage>("/gallery", body),

	update: (id: string, body: Partial<{
		media_id: string
		// null disconnects the category (PATCH: undefined = leave unchanged)
		category_id: string | null
		taken_at: string
		author: string
		tags: string[]
		locations: string[]
		translations: {
			lang: string
			title?: string
			description?: string
		}[]
	}>) => api.patch<GalleryImage>(`/gallery/${id}`, body),

	remove: (id: string) => api.delete(`/gallery/${id}`),

	trash: (params?: { page?: number; limit?: number }) =>
		api.get<PaginatedResponse<GalleryImage>>("/gallery/trash", { params }),

	restore: (id: string) => api.post<GalleryImage>(`/gallery/${id}/restore`),
}
