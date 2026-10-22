import { useMutation, useQueryClient } from "@tanstack/react-query"
import { booksService } from "@/services/books.service"
import { queryKeys } from "./keys"
import { makeResourceQueries } from "./factory"
import type { Book, BookDetail, PaginatedResponse } from "@/types"

type ListParams = {
	page?: number
	limit?: number
	category_id?: string
	search?: string
	is_publication?: boolean
}

type CreateBody = Parameters<typeof booksService.create>[0]
type UpdateBody = Parameters<typeof booksService.update>[1]

const queries = makeResourceQueries<
	BookDetail,
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

/**
 * Optimistic publish toggle (audios pattern): flip every cached list page
 * immediately, roll back on error.
 */
export function useTogglePublishBook() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ id, is_published }: { id: string; is_published: boolean }) =>
			booksService.togglePublish(id, is_published),
		onMutate: async ({ id, is_published }) => {
			await qc.cancelQueries({ queryKey: queryKeys.books.lists() })
			const snapshots = qc.getQueriesData<PaginatedResponse<Book>>({
				queryKey: queryKeys.books.lists(),
			})
			snapshots.forEach(([key, data]) => {
				if (!data) return
				qc.setQueryData<PaginatedResponse<Book>>(key, {
					...data,
					items: data.items.map((b) =>
						b.id === id ? { ...b, is_published } : b,
					),
				})
			})
			return { snapshots }
		},
		onError: (_e, _vars, ctx) => {
			ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data))
		},
		onSettled: (_data, _err, { id }) => {
			qc.invalidateQueries({ queryKey: queryKeys.books.lists() })
			qc.invalidateQueries({ queryKey: queryKeys.books.detail(id) })
		},
	})
}
