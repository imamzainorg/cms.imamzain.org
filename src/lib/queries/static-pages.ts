import {
	useMutation,
	useQuery,
	useQueryClient,
	keepPreviousData,
} from "@tanstack/react-query"
import { staticPagesService } from "@/services/static-pages.service"
import type { StaticPage, PaginatedResponse } from "@/types"
import { queryKeys } from "./keys"
import { makeResourceQueries } from "./factory"

type ListParams = {
	page?: number
	limit?: number
	is_published?: boolean
}

type CreateBody = Parameters<typeof staticPagesService.create>[0]
type UpdateBody = Parameters<typeof staticPagesService.update>[1]

const queries = makeResourceQueries<
	StaticPage,
	PaginatedResponse<StaticPage>,
	CreateBody,
	UpdateBody,
	ListParams
>({
	service: staticPagesService,
	keys: queryKeys.staticPages,
})

export const useStaticPagesList = queries.useList
export const useStaticPage = queries.useOne
export const useCreateStaticPage = queries.useCreate
export const useUpdateStaticPage = queries.useUpdate

/** Soft-delete — moves the page to trash, so both caches must refresh. */
export function useDeleteStaticPage() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => staticPagesService.remove(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.staticPages.lists() })
			qc.invalidateQueries({ queryKey: queryKeys.trash.all })
		},
	})
}

export function useStaticPagesTrash(params: { page?: number; limit?: number } = {}) {
	return useQuery({
		queryKey: queryKeys.trash.resource("static-pages", params),
		queryFn: async () => (await staticPagesService.trash(params)).data,
		placeholderData: keepPreviousData,
	})
}

export function useRestoreStaticPage() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => staticPagesService.restore(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.staticPages.lists() })
			qc.invalidateQueries({ queryKey: queryKeys.trash.all })
		},
	})
}

/**
 * Optimistic publish toggle: flip every cached list page immediately, roll
 * back on error (same shape as posts' useTogglePublishPost).
 */
export function useToggleStaticPagePublish() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ id, is_published }: { id: string; is_published: boolean }) =>
			staticPagesService.togglePublish(id, is_published),
		onMutate: async ({ id, is_published }) => {
			await qc.cancelQueries({ queryKey: queryKeys.staticPages.lists() })
			const snapshots = qc.getQueriesData<PaginatedResponse<StaticPage>>({
				queryKey: queryKeys.staticPages.lists(),
			})
			snapshots.forEach(([key, data]) => {
				if (!data) return
				qc.setQueryData<PaginatedResponse<StaticPage>>(key, {
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
			qc.invalidateQueries({ queryKey: queryKeys.staticPages.lists() })
			qc.invalidateQueries({ queryKey: queryKeys.staticPages.detail(id) })
		},
	})
}
