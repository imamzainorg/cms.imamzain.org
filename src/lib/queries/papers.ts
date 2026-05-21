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
