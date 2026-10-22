import { useMutation, useQueryClient } from "@tanstack/react-query"
import { papersService } from "@/services/papers.service"
import { queryKeys } from "./keys"
import { makeResourceQueries } from "./factory"
import type { AcademicPaper, PaginatedResponse } from "@/types"

type ListParams = {
	page?: number
	limit?: number
	category_id?: string
	search?: string
}

type CreateBody = Parameters<typeof papersService.create>[0]
type UpdateBody = Parameters<typeof papersService.update>[1]

const queries = makeResourceQueries<
	AcademicPaper,
	PaginatedResponse<AcademicPaper>,
	CreateBody,
	UpdateBody,
	ListParams
>({
	service: papersService,
	keys: queryKeys.papers,
})

export const usePapersList = queries.useList
export const usePaper = queries.useOne
export const useCreatePaper = queries.useCreate
export const useUpdatePaper = queries.useUpdate
export const useDeletePaper = queries.useRemove

/**
 * Optimistic publish toggle (books pattern): flip every cached list page
 * immediately, roll back on error.
 */
export function useTogglePublishPaper() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ id, is_published }: { id: string; is_published: boolean }) =>
			papersService.togglePublish(id, is_published),
		onMutate: async ({ id, is_published }) => {
			await qc.cancelQueries({ queryKey: queryKeys.papers.lists() })
			const snapshots = qc.getQueriesData<PaginatedResponse<AcademicPaper>>({
				queryKey: queryKeys.papers.lists(),
			})
			snapshots.forEach(([key, data]) => {
				if (!data) return
				qc.setQueryData<PaginatedResponse<AcademicPaper>>(key, {
					...data,
					items: data.items.map((p) =>
						p.id === id ? { ...p, is_published } : p,
					),
				})
			})
			return { snapshots }
		},
		onError: (_e, _vars, ctx) => {
			ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data))
		},
		onSettled: (_data, _err, { id }) => {
			qc.invalidateQueries({ queryKey: queryKeys.papers.lists() })
			qc.invalidateQueries({ queryKey: queryKeys.papers.detail(id) })
		},
	})
}
