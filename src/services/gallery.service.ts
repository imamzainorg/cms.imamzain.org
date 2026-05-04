import { api } from "@/lib/api"
import type { GalleryImage, GalleryCategory } from "@/types"

export const galleryService = {
	list: (params?: {
		page?: number
		limit?: number
		category_id?: string
		tags?: string[]
		locations?: string[]
	}) => api.get<{ images: GalleryImage[]; total: number }>("/gallery", { params }),

	get: (id: string) => api.get<GalleryImage>(`/gallery/${id}`),

	create: (body: {
		media_id: string
		category_id?: string
		tags?: string[]
		location?: string
		translations?: {
			lang: string
			title?: string
			caption?: string
			is_default: boolean
		}[]
	}) => api.post<GalleryImage>("/gallery", body),

	update: (id: string, body: Partial<{
		category_id: string
		tags: string[]
		location: string
		translations: {
			lang: string
			title?: string
			caption?: string
			is_default: boolean
		}[]
	}>) => api.patch<GalleryImage>(`/gallery/${id}`, body),

	remove: (id: string) => api.delete(`/gallery/${id}`),

	listCategories: () => api.get<{ categories: GalleryCategory[] }>("/gallery-categories"),
}