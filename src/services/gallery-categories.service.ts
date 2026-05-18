import { api } from "@/lib/api"
import type { GalleryCategory, PaginatedResponse, CategoryTranslation } from "@/types"

export const galleryCategoriesService = {
	list: (params?: { page?: number; limit?: number }) =>
		api.get<PaginatedResponse<GalleryCategory>>("/gallery-categories", { params }),

	get: (id: string) => api.get<GalleryCategory>(`/gallery-categories/${id}`),

	create: (body: { translations: CategoryTranslation[] }) =>
		api.post<GalleryCategory>("/gallery-categories", body),

	update: (id: string, body: { translations: CategoryTranslation[] }) =>
		api.patch<GalleryCategory>(`/gallery-categories/${id}`, body),

	remove: (id: string) => api.delete(`/gallery-categories/${id}`),

	trash: (params?: { page?: number; limit?: number }) =>
		api.get<PaginatedResponse<GalleryCategory>>("/gallery-categories/trash", { params }),

	restore: (id: string) => api.post<GalleryCategory>(`/gallery-categories/${id}/restore`),
}
