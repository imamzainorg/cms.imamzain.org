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
 * Server-side list: `ProxyVisitQueryDto` now whitelists `?status=` (alongside
 * page/limit), so pagination and status filtering are done by the API. The
 * old fetch-100-and-filter-client-side workaround is gone.
 */
export function useProxyVisitsList(params: ListParams = {}) {
	return useQuery({
		queryKey: queryKeys.proxyVisits.list(params),
		queryFn: async () => (await proxyVisitsService.list(params)).data,
		placeholderData: keepPreviousData,
	})
}

/**
 * Count of proxy-visit requests matching a status (or grand total).
 * No dedicated stats endpoint — a `limit:1` request per filter and we read
 * `pagination.total` (same pattern as `useSubscriberCount`).
 */
export function useProxyVisitCount(filter: { status?: Status } = {}) {
	return useQuery({
		queryKey: queryKeys.proxyVisits.list({ count: true, ...filter }),
		queryFn: async () => {
			const r = await proxyVisitsService.list({ limit: 1, ...filter })
			return r.data.pagination.total
		},
	})
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
			qc.invalidateQueries({ queryKey: queryKeys.trash.all })
		},
	})
}

export function useProxyVisitsTrash(params: { page?: number; limit?: number } = {}) {
	return useQuery({
		queryKey: queryKeys.trash.resource("proxy-visits", params),
		queryFn: async () => (await proxyVisitsService.trash(params)).data,
		placeholderData: keepPreviousData,
	})
}

export function useRestoreProxyVisit() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => proxyVisitsService.restore(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.proxyVisits.all })
			qc.invalidateQueries({ queryKey: queryKeys.trash.all })
		},
	})
}
