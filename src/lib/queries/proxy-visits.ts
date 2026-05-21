import {
	useMutation,
	useQuery,
	useQueryClient,
	keepPreviousData,
} from "@tanstack/react-query"
import { proxyVisitsService } from "@/services/proxy-visits.service"
import { queryKeys } from "./keys"

type Status = "PENDING" | "APPROVED" | "COMPLETED" | "REJECTED"

type ListParams = {
	page?: number
	limit?: number
	status?: Status
}

/**
 * Backend caveat (mirrors contacts): `/forms/proxy-visits` rejects `?status=`
 * as non-whitelisted. We fetch the full inbox once and filter / count
 * client-side. All variants share a single cache entry — previously every
 * status filter and every count caused a separate identical round-trip.
 *
 * `_params` is preserved for backwards-compat but no longer affects the key.
 * Remove when the API team adds `status` to the DTO whitelist.
 */
export function useProxyVisitsList(_params: ListParams = {}) {
	return useQuery({
		queryKey: queryKeys.proxyVisits.inbox(),
		queryFn: async () => (await proxyVisitsService.list({ limit: 100 })).data,
		placeholderData: keepPreviousData,
	})
}

/**
 * Count of proxy-visit requests matching a status (or grand total).
 * Derives from the shared inbox query — no separate round-trip.
 */
export function useProxyVisitCount(filter: { status?: Status } = {}) {
	const inbox = useProxyVisitsList()
	const count = filter.status
		? inbox.data?.items.filter((v) => v.status === filter.status).length ?? 0
		: inbox.data?.pagination.total ?? 0
	return { ...inbox, data: count }
}

export function useUpdateProxyVisit() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ id, body }: { id: string; body: { status: Status; processed_at?: string } }) =>
			proxyVisitsService.update(id, body),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.proxyVisits.all })
		},
	})
}

export function useDeleteProxyVisit() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => proxyVisitsService.remove(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.proxyVisits.all })
		},
	})
}
