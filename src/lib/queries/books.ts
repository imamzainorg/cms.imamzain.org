import {
	useMutation,
	useQuery,
	useQueryClient,
	keepPreviousData,
} from "@tanstack/react-query"
import { booksService } from "@/services/books.service"
import { queryKeys } from "./keys"

type ListParams = {
	page?: number
	limit?: number
	category_id?: string
	search?: string
}

type CreateBody = Parameters<typeof booksService.create>[0]
type UpdateBody = Parameters<typeof booksService.update>[1]

export function useBooksList(params: ListParams) {
	return useQuery({
		queryKey: queryKeys.books.list(params),
		queryFn: async () => (await booksService.list(params)).data,
		placeholderData: keepPreviousData,
	})
}

export function useBook(id: string | undefined) {
	return useQuery({
		queryKey: queryKeys.books.detail(id ?? ""),
		queryFn: async () => (await booksService.get(id!)).data,
		enabled: !!id,
	})
}

export function useCreateBook() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (body: CreateBody) => booksService.create(body),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.books.lists() })
		},
	})
}

export function useUpdateBook() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ id, body }: { id: string; body: UpdateBody }) =>
			booksService.update(id, body),
		onSuccess: (_data, { id }) => {
			qc.invalidateQueries({ queryKey: queryKeys.books.lists() })
			qc.invalidateQueries({ queryKey: queryKeys.books.detail(id) })
		},
	})
}

export function useDeleteBook() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => booksService.remove(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.books.lists() })
		},
	})
}
