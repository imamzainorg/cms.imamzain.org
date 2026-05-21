import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query"
import type { QueryKey } from "@tanstack/react-query"
import type { AxiosResponse } from "axios"

/**
 * Generic CRUD hook factory for resources that follow the "boring template":
 *
 *   - list(params)  → paginated GET
 *   - get(id)       → detail GET (optional)
 *   - create(body)  → POST
 *   - update(id,body) → PATCH / PUT
 *   - remove(id)    → DELETE
 *
 * Invalidation is hard-coded to:
 *   - create / remove → invalidate keys.lists()
 *   - update          → invalidate keys.lists() AND keys.detail(id) (if present)
 *
 * Resources that need broader invalidation (e.g. daily-hadiths, which also
 * has pins/today) should be hand-rolled — the factory is for the >70%
 * majority that look the same.
 *
 * Usage:
 *
 *   const queries = makeResourceQueries({ service: booksService, keys: queryKeys.books })
 *   export const useBooksList = queries.useList
 *   export const useBook = queries.useOne
 *   export const useCreateBook = queries.useCreate
 *   export const useUpdateBook = queries.useUpdate
 *   export const useDeleteBook = queries.useRemove
 */

type ResourceService<TItem, TList, TCreate, TUpdate, TListParams> = {
	list: (params?: TListParams) => Promise<AxiosResponse<TList>>
	get?: (id: string) => Promise<AxiosResponse<TItem>>
	create: (body: TCreate) => Promise<AxiosResponse<TItem>>
	update: (id: string, body: TUpdate) => Promise<AxiosResponse<TItem>>
	remove: (id: string) => Promise<AxiosResponse<unknown>>
}

type ResourceKeys = {
	all: readonly unknown[]
	lists: () => QueryKey
	list: (params: Record<string, unknown>) => QueryKey
	detail?: (id: string) => QueryKey
}

export function makeResourceQueries<
	TItem,
	TList,
	TCreate,
	TUpdate,
	TListParams extends Record<string, unknown>,
>(opts: {
	service: ResourceService<TItem, TList, TCreate, TUpdate, TListParams>
	keys: ResourceKeys
	/** Defaults for `useList` when the caller passes nothing. Optional. */
	defaultListParams?: TListParams
	/**
	 * Invalidation scope on mutations.
	 * - `"lists"` (default) — invalidate `keys.lists()` on create/remove
	 *   and `keys.lists()` + `keys.detail(id)` on update. Right for most
	 *   resources where extra-list queries don't share cache.
	 * - `"all"` — invalidate the whole `keys.all` branch on every
	 *   mutation. Use when the resource has sibling queries (today, pins,
	 *   stats) that should refresh together with lists.
	 */
	invalidate?: "lists" | "all"
}) {
	const { service, keys, defaultListParams, invalidate = "lists" } = opts
	const listsKey = invalidate === "all" ? keys.all : keys.lists()

	function useList(params: TListParams = (defaultListParams ?? {}) as TListParams) {
		return useQuery({
			queryKey: keys.list(params),
			queryFn: async () => (await service.list(params)).data,
			placeholderData: keepPreviousData,
		})
	}

	function useOne(id: string | undefined) {
		const detailKey = keys.detail
			? keys.detail(id ?? "")
			: [...keys.all, "detail", id ?? ""]
		return useQuery({
			queryKey: detailKey,
			queryFn: async () => (await service.get!(id!)).data,
			enabled: !!id && !!service.get,
		})
	}

	function useCreate() {
		const qc = useQueryClient()
		return useMutation({
			mutationFn: (body: TCreate) => service.create(body),
			onSuccess: () => {
				qc.invalidateQueries({ queryKey: listsKey })
			},
		})
	}

	function useUpdate() {
		const qc = useQueryClient()
		return useMutation({
			mutationFn: ({ id, body }: { id: string; body: TUpdate }) =>
				service.update(id, body),
			onSuccess: (_data, { id }) => {
				qc.invalidateQueries({ queryKey: listsKey })
				if (invalidate !== "all" && keys.detail) {
					qc.invalidateQueries({ queryKey: keys.detail(id) })
				}
			},
		})
	}

	function useRemove() {
		const qc = useQueryClient()
		return useMutation({
			mutationFn: (id: string) => service.remove(id),
			onSuccess: () => {
				qc.invalidateQueries({ queryKey: listsKey })
			},
		})
	}

	return { useList, useOne, useCreate, useUpdate, useRemove }
}
