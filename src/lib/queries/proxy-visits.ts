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
 * Backend bug: `/forms/proxy-visits` declares `?status=` as a separate
 * `@Query('status')` param, but the global `ValidationPipe` runs with
 * `forbidNonWhitelisted: true` against `PaginationDto`, which doesn't list
 * `status` — so any `?status=...` returns 400 "Validation failed".
 * Workaround: never send `status` to the server; filter client-side.
 * Remove when the API team adds `status` to the relevant DTO.
 */
export function useProxyVisitsList(params: ListParams) {
	const { status: _status, ...safeParams } = params
	return useQuery({
		queryKey: queryKeys.proxyVisits.list(params),
		queryFn: async () => (await proxyVisitsService.list(safeParams)).data,
		placeholderData: keepPreviousData,
	})
}

export function useProxyVisitCount(filter: { status?: Status }) {
	return useQuery({
		queryKey: queryKeys.proxyVisits.list({ count: true, ...filter }),
		queryFn: async () => {
			const r = await proxyVisitsService.list({ limit: 100 })
			if (!filter.status) return r.data.pagination.total
			return r.data.items.filter((v) => v.status === filter.status).length
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
		},
	})
}
