import { api } from "@/lib/api"
import type { Book, BookCategory, PaginatedResponse } from "@/types"

export const booksService = {
	list: (params?: { page?: number; limit?: number; category_id?: string; search?: string }) =>
		api.get<PaginatedResponse<Book>>("/books", { params }),

	get: (id: string) => api.get<Book>(`/books/${id}`),

	create: (body: {
		category_id: string
		cover_image_id?: string
		isbn?: string
		pages?: number
		publish_year?: string
		part_number?: number
		parts?: number
		translations: {
			lang: string
			title: string
			author?: string
			publisher?: string
			description?: string
			series?: string
			is_default: boolean
		}[]
	}) => api.post<Book>("/books", body),

	update: (id: string, body: Partial<{
		category_id: string
		cover_image_id: string
		isbn: string
		pages: number
		publish_year: string
		part_number: number
		parts: number
		translations: {
			lang: string
			title: string
			author?: string
			publisher?: string
			description?: string
			series?: string
			is_default: boolean
		}[]
	}>) => api.patch<Book>(`/books/${id}`, body),

	remove: (id: string) => api.delete(`/books/${id}`),

	listCategories: () => api.get<PaginatedResponse<BookCategory>>("/book-categories"),
}
