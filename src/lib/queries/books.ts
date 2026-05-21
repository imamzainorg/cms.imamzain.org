import { booksService } from "@/services/books.service"
import { queryKeys } from "./keys"
import { makeResourceQueries } from "./factory"
import type { Book, PaginatedResponse } from "@/types"

type ListParams = {
	page?: number
	limit?: number
	category_id?: string
	search?: string
}

type CreateBody = Parameters<typeof booksService.create>[0]
type UpdateBody = Parameters<typeof booksService.update>[1]

const queries = makeResourceQueries<
	Book,
	PaginatedResponse<Book>,
	CreateBody,
	UpdateBody,
	ListParams
>({
	service: booksService,
	keys: queryKeys.books,
})

export const useBooksList = queries.useList
export const useBook = queries.useOne
export const useCreateBook = queries.useCreate
export const useUpdateBook = queries.useUpdate
export const useDeleteBook = queries.useRemove
