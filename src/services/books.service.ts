import { api } from "@/lib/api"
import type { Book, BookDetail, PaginatedResponse } from "@/types"
import { requestAndUploadPdf, type PdfUploadUrlResponse } from "./pdf-upload"

export const booksService = {
	// Admin routes — the public GET /books hides unpublished drafts, which
	// would otherwise silently disappear from the CMS itself.
	// NOTE: BookQueryDto has no is_published filter (forbidNonWhitelisted would
	// 400 it) — /books/admin always returns drafts + published together.
	// Series volumes never appear here (only their parent does).
	list: (params?: {
		page?: number
		limit?: number
		category_id?: string
		search?: string
		/** Exact `true`/`false` only; omit for "no filter". */
		is_publication?: boolean
	}) => api.get<PaginatedResponse<Book>>("/books/admin", { params }),

	// Detail carries `parts[]` (series parent) or `parent` (volume).
	get: (id: string) => api.get<BookDetail>(`/books/admin/${id}`),

	create: (body: {
		category_id: string
		cover_image_id?: string
		slug?: string
		isbn?: string
		pages?: number
		publish_year?: string
		pdf_url?: string
		document_languages?: string[]
		// part_number and parts go together (400 otherwise); part_number <= parts.
		part_number?: number
		parts?: number
		// Makes this row a volume of that series (must be a top-level book).
		parent_id?: string
		is_publication?: boolean
		is_published?: boolean
		translations: {
			lang: string
			title: string
			author?: string
			publisher?: string
			description?: string
			series?: string
			meta_title?: string
			meta_description?: string
			og_image_id?: string | null
			is_default: boolean
		}[]
	}) => api.post<Book>("/books", body),

	update: (id: string, body: Partial<{
		category_id: string
		cover_image_id: string
		// null clears the stored slug (PATCH: undefined = leave unchanged)
		slug: string | null
		// null clears (PATCH: undefined = leave unchanged)
		isbn: string | null
		pages: number | null
		publish_year: string | null
		// null clears the stored URL (PATCH: undefined = leave unchanged)
		pdf_url: string | null
		// replaces the whole array — never send null (NOT NULL column)
		document_languages: string[]
		// null clears both (send the pair together); a number needs its partner.
		part_number: number | null
		parts: number | null
		// null detaches the volume from its series.
		parent_id: string | null
		is_publication: boolean
		is_published: boolean
		translations: {
			lang: string
			title: string
			author?: string
			publisher?: string
			description?: string
			series?: string
			meta_title?: string
			meta_description?: string
			og_image_id?: string | null
			is_default: boolean
		}[]
	}>) => api.patch<Book>(`/books/${id}`, body),

	togglePublish: (id: string, is_published: boolean) =>
		api.patch<Book>(`/books/${id}/publish`, { is_published }),

	remove: (id: string) => api.delete(`/books/${id}`),

	trash: (params?: { page?: number; limit?: number }) =>
		api.get<PaginatedResponse<Book>>("/books/trash", { params }),

	restore: (id: string) => api.post<Book>(`/books/${id}/restore`),

	requestPdfUploadUrl: (filename: string) =>
		api.post<PdfUploadUrlResponse>("/books/upload-url", { filename }),

	/** Validate → request upload URL → validate size → PUT to R2. No confirm step. */
	uploadPdf: (file: File) => requestAndUploadPdf(file, booksService.requestPdfUploadUrl),
}
