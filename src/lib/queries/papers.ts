import {
	useMutation,
	useQuery,
	useQueryClient,
	keepPreviousData,
} from "@tanstack/react-query"
import { papersService } from "@/services/papers.service"
import { queryKeys } from "./keys"

type ListParams = {
	page?: number
	limit?: number
	category_id?: string
	search?: string
}

type CreateBody = Parameters<typeof papersService.create>[0]
type UpdateBody = Parameters<typeof papersService.update>[1]

export function usePapersList(params: ListParams) {
	return useQuery({
		queryKey: queryKeys.papers.list(params),
		queryFn: async () => (await papersService.list(params)).data,
		placeholderData: keepPreviousData,
	})
}

export function usePaper(id: string | undefined) {
	return useQuery({
		queryKey: queryKeys.papers.detail(id ?? ""),
		queryFn: async () => (await papersService.get(id!)).data,
		enabled: !!id,
	})
}

export function useCreatePaper() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (body: CreateBody) => papersService.create(body),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.papers.lists() })
		},
	})
}

export function useUpdatePaper() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ id, body }: { id: string; body: UpdateBody }) =>
			papersService.update(id, body),
		onSuccess: (_data, { id }) => {
			qc.invalidateQueries({ queryKey: queryKeys.papers.lists() })
			qc.invalidateQueries({ queryKey: queryKeys.papers.detail(id) })
		},
	})
}

export function useDeletePaper() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => papersService.remove(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.papers.lists() })
		},
	})
}
