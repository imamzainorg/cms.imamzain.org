import { api } from "@/lib/api"
import type { BookCategory, PaginatedResponse, CategoryTranslation } from "@/types"

export const bookCategoriesService = {
	list: (params?: { page?: number; limit?: number }) =>
		api.get<PaginatedResponse<BookCategory>>("/book-categories", { params }),

	get: (id: string) => api.get<BookCategory>(`/book-categories/${id}`),

	create: (body: { translations: CategoryTranslation[] }) =>
		api.post<BookCategory>("/book-categories", body),

	update: (id: string, body: { translations: CategoryTranslation[] }) =>
		api.patch<BookCategory>(`/book-categories/${id}`, body),

	remove: (id: string) => api.delete(`/book-categories/${id}`),

	trash: (params?: { page?: number; limit?: number }) =>
		api.get<PaginatedResponse<BookCategory>>("/book-categories/trash", { params }),

	restore: (id: string) => api.post<BookCategory>(`/book-categories/${id}/restore`),
}
