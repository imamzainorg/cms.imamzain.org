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
 * Backend bug: `/forms/contacts` declares `?status=` as a separate
 * `@Query('status')` param, but the global `ValidationPipe` runs with
 * `forbidNonWhitelisted: true` against `PaginationDto`, which doesn't list
 * `status` — so any `?status=...` returns 400 "Validation failed".
 * Workaround: never send `status` to the server; filter client-side.
 * Remove when the API team adds `status` to the relevant DTO.
 */
export function useContactsList(params: ListParams) {
	const { status: _status, ...safeParams } = params
	return useQuery({
		queryKey: queryKeys.contacts.list(params),
		queryFn: async () => (await contactsService.list(safeParams)).data,
		placeholderData: keepPreviousData,
	})
}

export function useContactCount(filter: { status?: Status }) {
	return useQuery({
		queryKey: queryKeys.contacts.list({ count: true, ...filter }),
		queryFn: async () => {
			const r = await contactsService.list({ limit: 100 })
			if (!filter.status) return r.data.pagination.total
			return r.data.items.filter((c) => c.status === filter.status).length
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
		},
	})
}
