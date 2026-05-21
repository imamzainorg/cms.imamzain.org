import {
	useMutation,
	useQuery,
	useQueryClient,
	keepPreviousData,
} from "@tanstack/react-query"
import { contactsService } from "@/services/contacts.service"
import { queryKeys } from "./keys"

type Status = "NEW" | "RESPONDED" | "SPAM"

type ListParams = {
	page?: number
	limit?: number
	status?: Status
}

/**
 * Backend caveat: `/forms/contacts` declares `?status=` as a separate
 * `@Query('status')` param, but the global `ValidationPipe` runs with
 * `forbidNonWhitelisted: true` against `PaginationDto`, which doesn't list
 * `status` — so any `?status=...` returns 400 "Validation failed".
 *
 * Workaround: fetch the full inbox once and let consumers filter / count
 * client-side. All variants share a SINGLE cache entry keyed on
 * `contacts.inbox()` — previously every status filter and every count
 * caused a separate identical round-trip.
 *
 * `_params` is preserved for backwards-compat with existing callers, but
 * the limit is fixed at 100 and `status` is intentionally not honored.
 * Remove when the API team adds `status` to the DTO whitelist.
 */
export function useContactsList(_params: ListParams = {}) {
	return useQuery({
		queryKey: queryKeys.contacts.inbox(),
		queryFn: async () => (await contactsService.list({ limit: 100 })).data,
		placeholderData: keepPreviousData,
	})
}

/**
 * Count of contacts matching a status (or grand total if no status given).
 * Derives from the shared inbox query — no separate round-trip.
 */
export function useContactCount(filter: { status?: Status } = {}) {
	const inbox = useContactsList()
	const count = filter.status
		? inbox.data?.items.filter((c) => c.status === filter.status).length ?? 0
		: inbox.data?.pagination.total ?? 0
	return { ...inbox, data: count }
}

export function useUpdateContact() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ id, body }: { id: string; body: { status: Status; responded_at?: string } }) =>
			contactsService.update(id, body),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.contacts.all })
		},
	})
}

export function useDeleteContact() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => contactsService.remove(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.contacts.all })
		},
	})
}
