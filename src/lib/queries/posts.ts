import {
	useMutation,
	useQuery,
	useQueryClient,
	keepPreviousData,
} from "@tanstack/react-query"
import { postsService } from "@/services/posts.service"
import type { Post, PaginatedResponse } from "@/types"
import { queryKeys } from "./keys"
import { makeResourceQueries } from "./factory"

type ListParams = {
	page?: number
	limit?: number
	category_id?: string
	search?: string
	status?: "draft" | "scheduled" | "published" | "all"
	featured?: boolean
	sort?: "newest" | "views"
}

type CreateBody = Parameters<typeof postsService.create>[0]
type UpdateBody = Parameters<typeof postsService.update>[1]

const queries = makeResourceQueries<
	Post,
	PaginatedResponse<Post>,
	CreateBody,
	UpdateBody,
	ListParams
>({
	service: postsService,
	keys: queryKeys.posts,
})

export const usePostsList = queries.useList
export const usePost = queries.useOne
export const useCreatePost = queries.useCreate
export const useUpdatePost = queries.useUpdate

export function usePostsTrash(params: { page?: number; limit?: number } = {}) {
	return useQuery({
		queryKey: queryKeys.trash.resource("posts", params),
		queryFn: async () => (await postsService.trash(params)).data,
		placeholderData: keepPreviousData,
	})
}

export function useDeletePost() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => postsService.remove(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.posts.lists() })
			qc.invalidateQueries({ queryKey: queryKeys.trash.all })
		},
	})
}

export function useRestorePost() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => postsService.restore(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.posts.lists() })
			qc.invalidateQueries({ queryKey: queryKeys.trash.all })
		},
	})
}

export function useBulkPublishPosts() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ ids, is_published }: { ids: string[]; is_published: boolean }) =>
			postsService.bulkPublish(ids, is_published),
		onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.posts.lists() }),
	})
}

export function useBulkDeletePosts() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (ids: string[]) => postsService.bulkDelete(ids),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.posts.lists() })
			qc.invalidateQueries({ queryKey: queryKeys.trash.all })
		},
	})
}

/**
 * Optimistic publish toggle: flip every cached list page immediately, roll
 * back on error. The server-side cron also flips scheduled posts to
 * published at their due time, but those land via a normal invalidation.
 */
export function useTogglePublishPost() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ id, is_published }: { id: string; is_published: boolean }) =>
			postsService.togglePublish(id, is_published),
		onMutate: async ({ id, is_published }) => {
			await qc.cancelQueries({ queryKey: queryKeys.posts.lists() })
			const snapshots = qc.getQueriesData<PaginatedResponse<Post>>({
				queryKey: queryKeys.posts.lists(),
			})
			snapshots.forEach(([key, data]) => {
				if (!data) return
				qc.setQueryData<PaginatedResponse<Post>>(key, {
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
		onSettled: () => {
			qc.invalidateQueries({ queryKey: queryKeys.posts.lists() })
		},
	})
}
