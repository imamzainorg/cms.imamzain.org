import {
	useMutation,
	useQuery,
	useQueryClient,
	keepPreviousData,
} from "@tanstack/react-query"
import { newsletterService } from "@/services/newsletter.service"
import { queryKeys } from "./keys"

type ListParams = {
	page?: number
	limit?: number
	is_active?: boolean
	search?: string
}

export function useSubscribersList(params: ListParams) {
	return useQuery({
		queryKey: queryKeys.newsletter.list(params),
		queryFn: async () => (await newsletterService.list(params)).data,
		placeholderData: keepPreviousData,
	})
}

/**
 * Subscriber counts. The API exposes no dedicated stats endpoint, so we fan
 * out three `limit:1` requests and rely on the pagination total. Each runs
 * as its own cached query so flipping tabs doesn't refire the others.
 */
export function useSubscriberCount(filter: { is_active?: boolean }) {
	return useQuery({
		queryKey: queryKeys.newsletter.list({ count: true, ...filter }),
		queryFn: async () => {
			const r = await newsletterService.list({ limit: 1, ...filter })
			return r.data.pagination.total
		},
	})
}

export function useToggleSubscriber() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
			is_active
				? newsletterService.unsubscribeById(id)
				: newsletterService.resubscribeById(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.newsletter.all })
		},
	})
}

export function useDeleteSubscriber() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => newsletterService.remove(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.newsletter.all })
			qc.invalidateQueries({ queryKey: queryKeys.trash.all })
		},
	})
}

export function useSubscribersTrash(params: { page?: number; limit?: number } = {}) {
	return useQuery({
		queryKey: queryKeys.trash.resource("newsletter-subscribers", params),
		queryFn: async () => (await newsletterService.trash(params)).data,
		placeholderData: keepPreviousData,
	})
}

export function useRestoreSubscriber() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => newsletterService.restore(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.newsletter.all })
			qc.invalidateQueries({ queryKey: queryKeys.trash.all })
		},
	})
}
