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
 * Server-side list: `ContactQueryDto` now whitelists `?status=` (alongside
 * page/limit), so pagination and status filtering are done by the API. The
 * old fetch-100-and-filter-client-side workaround is gone.
 */
export function useContactsList(params: ListParams = {}) {
	return useQuery({
		queryKey: queryKeys.contacts.list(params),
		queryFn: async () => (await contactsService.list(params)).data,
		placeholderData: keepPreviousData,
	})
}

/**
 * Count of contacts matching a status (or grand total if no status given).
 * No dedicated stats endpoint — a `limit:1` request per filter and we read
 * `pagination.total` (same pattern as `useSubscriberCount`).
 */
export function useContactCount(filter: { status?: Status } = {}) {
	return useQuery({
		queryKey: queryKeys.contacts.list({ count: true, ...filter }),
		queryFn: async () => {
			const r = await contactsService.list({ limit: 1, ...filter })
			return r.data.pagination.total
		},
	})
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
			qc.invalidateQueries({ queryKey: queryKeys.trash.all })
		},
	})
}

export function useContactsTrash(params: { page?: number; limit?: number } = {}) {
	return useQuery({
		queryKey: queryKeys.trash.resource("contacts", params),
		queryFn: async () => (await contactsService.trash(params)).data,
		placeholderData: keepPreviousData,
	})
}

export function useRestoreContact() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => contactsService.restore(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.contacts.all })
			qc.invalidateQueries({ queryKey: queryKeys.trash.all })
		},
	})
}
