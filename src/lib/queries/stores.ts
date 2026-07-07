import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
	type QueryClient,
} from "@tanstack/react-query"
import { storesService } from "@/services/stores.service"
import { queryKeys } from "./keys"
import { makeResourceQueries } from "./factory"
import type { PaginatedResponse, Store } from "@/types"

type ListParams = { page?: number; limit?: number }
type CreateBody = Parameters<typeof storesService.create>[0]
type UpdateBody = Parameters<typeof storesService.update>[1]
type LocationCreateBody = Parameters<typeof storesService.addLocation>[1]
type LocationUpdateBody = Parameters<typeof storesService.updateLocation>[2]

const queries = makeResourceQueries<
	Store,
	PaginatedResponse<Store>,
	CreateBody,
	UpdateBody,
	ListParams
>({
	service: storesService,
	keys: queryKeys.stores,
})

export const useStoresList = queries.useList
export const useStore = queries.useOne
export const useCreateStore = queries.useCreate
export const useUpdateStore = queries.useUpdate

/** Soft delete — refreshes both the live lists and the trash view. */
export function useDeleteStore() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => storesService.remove(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.stores.lists() })
			qc.invalidateQueries({ queryKey: queryKeys.trash.all })
		},
	})
}

export function useRestoreStore() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => storesService.restore(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.stores.all })
			qc.invalidateQueries({ queryKey: queryKeys.trash.all })
		},
	})
}

export function useStoresTrash(params: ListParams = {}) {
	return useQuery({
		queryKey: queryKeys.trash.resource("stores", params),
		queryFn: async () => (await storesService.trash(params)).data,
		placeholderData: keepPreviousData,
	})
}

// ── Nested sale-points ──────────────────────────────────────────────
// Every location mutation returns the FULL updated store, so refresh
// the lists (cards embed locations inline) plus the store's detail key.

function invalidateStore(qc: QueryClient, storeId: string) {
	qc.invalidateQueries({ queryKey: queryKeys.stores.lists() })
	qc.invalidateQueries({ queryKey: queryKeys.stores.detail(storeId) })
}

export function useAddStoreLocation() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ storeId, body }: { storeId: string; body: LocationCreateBody }) =>
			storesService.addLocation(storeId, body),
		onSuccess: (_data, { storeId }) => invalidateStore(qc, storeId),
	})
}

export function useUpdateStoreLocation() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ storeId, locationId, body }: { storeId: string; locationId: string; body: LocationUpdateBody }) =>
			storesService.updateLocation(storeId, locationId, body),
		onSuccess: (_data, { storeId }) => invalidateStore(qc, storeId),
	})
}

export function useRemoveStoreLocation() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ storeId, locationId }: { storeId: string; locationId: string }) =>
			storesService.removeLocation(storeId, locationId),
		onSuccess: (_data, { storeId }) => invalidateStore(qc, storeId),
	})
}
