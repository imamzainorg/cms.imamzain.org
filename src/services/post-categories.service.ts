import { api } from "@/lib/api"
import type { PostCategory, PaginatedResponse, CategoryTranslation } from "@/types"

export const postCategoriesService = {
	list: (params?: { page?: number; limit?: number }) =>
		api.get<PaginatedResponse<PostCategory>>("/post-categories", { params }),

	get: (id: string) => api.get<PostCategory>(`/post-categories/${id}`),

	create: (body: { translations: CategoryTranslation[] }) =>
		api.post<PostCategory>("/post-categories", body),

	update: (id: string, body: { translations: CategoryTranslation[] }) =>
		api.patch<PostCategory>(`/post-categories/${id}`, body),

	remove: (id: string) => api.delete(`/post-categories/${id}`),

	trash: (params?: { page?: number; limit?: number }) =>
		api.get<PaginatedResponse<PostCategory>>("/post-categories/trash", { params }),

	restore: (id: string) => api.post<PostCategory>(`/post-categories/${id}/restore`),
}
