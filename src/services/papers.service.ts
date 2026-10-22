import { api } from "@/lib/api"
import type { AcademicPaper, PaginatedResponse } from "@/types"
import { requestAndUploadPdf, type PdfUploadUrlResponse } from "./pdf-upload"

export const papersService = {
	// Admin routes — the public GET /academic-papers hides unpublished drafts,
	// which would otherwise silently disappear from the CMS itself.
	// NOTE: unlike static-pages/audios, AcademicPaperQueryDto has no
	// `is_published` filter — forbidNonWhitelisted 400s if it's sent as a
	// query param, so it is intentionally absent here (present in create/update).
	list: (params?: { page?: number; limit?: number; category_id?: string; search?: string }) =>
		api.get<PaginatedResponse<AcademicPaper>>("/academic-papers/admin", { params }),

	get: (id: string) => api.get<AcademicPaper>(`/academic-papers/admin/${id}`),

	create: (body: {
		category_id: string
		published_year?: string
		pdf_url?: string
		document_languages?: string[]
		is_published?: boolean
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
		// null clears (PATCH: undefined = leave unchanged)
		published_year: string | null
		// null clears the stored URL (PATCH: undefined = leave unchanged)
		pdf_url: string | null
		// replaces the whole array — never send null (NOT NULL column)
		document_languages: string[]
		is_published: boolean
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

	togglePublish: (id: string, is_published: boolean) =>
		api.patch<AcademicPaper>(`/academic-papers/${id}/publish`, { is_published }),

	remove: (id: string) => api.delete(`/academic-papers/${id}`),

	trash: (params?: { page?: number; limit?: number }) =>
		api.get<PaginatedResponse<AcademicPaper>>("/academic-papers/trash", { params }),

	restore: (id: string) => api.post<AcademicPaper>(`/academic-papers/${id}/restore`),

	requestPdfUploadUrl: (filename: string) =>
		api.post<PdfUploadUrlResponse>("/academic-papers/upload-url", { filename }),

	/** Validate → request upload URL → validate size → PUT to R2. No confirm step. */
	uploadPdf: (file: File) => requestAndUploadPdf(file, papersService.requestPdfUploadUrl),
}
