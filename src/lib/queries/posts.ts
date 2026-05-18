import {
	useMutation,
	useQuery,
	useQueryClient,
	keepPreviousData,
} from "@tanstack/react-query"
import { postsService } from "@/services/posts.service"
import type { Post, PaginatedResponse } from "@/types"
import { queryKeys } from "./keys"

type ListParams = {
	page?: number
	limit?: number
	category_id?: string
	search?: string
	status?: "draft" | "scheduled" | "published" | "all"
	featured?: boolean
	sort?: "newest" | "views"
}

export function usePostsList(params: ListParams) {
	return useQuery({
		queryKey: queryKeys.posts.list(params),
		queryFn: async () => (await postsService.list(params)).data,
		placeholderData: keepPreviousData,
	})
}

export function usePost(id: string | undefined) {
	return useQuery({
		queryKey: queryKeys.posts.detail(id ?? ""),
		queryFn: async () => (await postsService.get(id!)).data,
		enabled: !!id,
	})
}

export function usePostsTrash(params: { page?: number; limit?: number } = {}) {
	return useQuery({
		queryKey: queryKeys.trash.resource("posts", params),
		queryFn: async () => (await postsService.trash(params)).data,
		placeholderData: keepPreviousData,
	})
}

type CreateBody = Parameters<typeof postsService.create>[0]
type UpdateBody = Parameters<typeof postsService.update>[1]

export function useCreatePost() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (body: CreateBody) => postsService.create(body),
		onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.posts.lists() }),
	})
}

export function useUpdatePost() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ id, body }: { id: string; body: UpdateBody }) =>
			postsService.update(id, body),
		onSuccess: (_data, { id }) => {
			qc.invalidateQueries({ queryKey: queryKeys.posts.lists() })
			qc.invalidateQueries({ queryKey: queryKeys.posts.detail(id) })
		},
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
