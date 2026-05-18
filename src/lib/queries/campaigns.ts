import {
	useMutation,
	useQuery,
	useQueryClient,
	keepPreviousData,
} from "@tanstack/react-query"
import { campaignsService } from "@/services/campaigns.service"
import type { CampaignStatus } from "@/types"
import { queryKeys } from "./keys"

type ListParams = { page?: number; limit?: number; status?: CampaignStatus }
type CreateBody = Parameters<typeof campaignsService.create>[0]
type UpdateBody = Parameters<typeof campaignsService.update>[1]

export function useCampaignsList(params: ListParams) {
	return useQuery({
		queryKey: queryKeys.campaigns.list(params),
		queryFn: async () => (await campaignsService.list(params)).data,
		placeholderData: keepPreviousData,
		// Send-flow updates counters every minute via cron; poll while a send
		// is in flight so the editor sees progress.
		refetchInterval: 30_000,
	})
}

export function useCampaign(id: string | undefined) {
	return useQuery({
		queryKey: queryKeys.campaigns.detail(id ?? ""),
		queryFn: async () => (await campaignsService.get(id!)).data,
		enabled: !!id,
		refetchInterval: 15_000,
	})
}

export function useCreateCampaign() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (body: CreateBody) => campaignsService.create(body),
		onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.campaigns.lists() }),
	})
}

export function useUpdateCampaign() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ id, body }: { id: string; body: UpdateBody }) =>
			campaignsService.update(id, body),
		onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.campaigns.all }),
	})
}

export function useSendCampaign() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => campaignsService.send(id),
		onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.campaigns.all }),
	})
}

export function useCancelCampaign() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => campaignsService.cancel(id),
		onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.campaigns.all }),
	})
}

export function useDeleteCampaign() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => campaignsService.remove(id),
		onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.campaigns.lists() }),
	})
}
