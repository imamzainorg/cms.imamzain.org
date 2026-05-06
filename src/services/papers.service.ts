import { api } from "@/lib/api"
import type { AcademicPaper, AcademicPaperCategory, PaginatedResponse } from "@/types"

export const papersService = {
	list: (params?: { page?: number; limit?: number; category_id?: string; search?: string }) =>
		api.get<PaginatedResponse<AcademicPaper>>("/academic-papers", { params }),

	get: (id: string) => api.get<AcademicPaper>(`/academic-papers/${id}`),

	create: (body: {
		category_id: string
		published_year?: string
		pdf_url?: string
		translations: {
			lang: string
			title: string
			abstract?: string
			authors: string[]
			keywords: string[]
			publication_venue?: string
			page_count?: number
			is_default: boolean
		}[]
	}) => api.post<AcademicPaper>("/academic-papers", body),

	update: (id: string, body: Partial<{
		category_id: string
		published_year: string
		pdf_url: string
		translations: {
			lang: string
			title: string
			abstract?: string
			authors: string[]
			keywords: string[]
			publication_venue?: string
			page_count?: number
			is_default: boolean
		}[]
	}>) => api.patch<AcademicPaper>(`/academic-papers/${id}`, body),

	remove: (id: string) => api.delete(`/academic-papers/${id}`),

	listCategories: () =>
		api.get<PaginatedResponse<AcademicPaperCategory>>("/academic-paper-categories"),
}
