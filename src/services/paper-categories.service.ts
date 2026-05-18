import { api } from "@/lib/api"
import type { AcademicPaperCategory, PaginatedResponse, CategoryTranslation } from "@/types"

export const paperCategoriesService = {
	list: (params?: { page?: number; limit?: number }) =>
		api.get<PaginatedResponse<AcademicPaperCategory>>("/academic-paper-categories", { params }),

	get: (id: string) => api.get<AcademicPaperCategory>(`/academic-paper-categories/${id}`),

	create: (body: { translations: CategoryTranslation[] }) =>
		api.post<AcademicPaperCategory>("/academic-paper-categories", body),

	update: (id: string, body: { translations: CategoryTranslation[] }) =>
		api.patch<AcademicPaperCategory>(`/academic-paper-categories/${id}`, body),

	remove: (id: string) => api.delete(`/academic-paper-categories/${id}`),

	trash: (params?: { page?: number; limit?: number }) =>
		api.get<PaginatedResponse<AcademicPaperCategory>>("/academic-paper-categories/trash", { params }),

	restore: (id: string) => api.post<AcademicPaperCategory>(`/academic-paper-categories/${id}/restore`),
}
