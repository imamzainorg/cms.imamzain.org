import {
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query"
import { dailyHadithsService } from "@/services/daily-hadiths.service"
import { queryKeys } from "./keys"
import { makeResourceQueries } from "./factory"
import type { DailyHadith, PaginatedResponse } from "@/types"

type ListParams = { page?: number; limit?: number }
type CreateBody = Parameters<typeof dailyHadithsService.create>[0]
type UpdateBody = Parameters<typeof dailyHadithsService.update>[1]

// The "core 5" come from the factory. We use invalidate: "all" so that
// every mutation also refreshes the sibling /today and /pins queries —
// rotating a hadith out of the list can change what /today returns,
// so the list-only invalidation default would leave them stale.
const queries = makeResourceQueries<
	DailyHadith,
	PaginatedResponse<DailyHadith>,
	CreateBody,
	UpdateBody,
	ListParams
>({
	service: dailyHadithsService,
	keys: queryKeys.dailyHadiths,
	invalidate: "all",
})

export const useDailyHadithsList = queries.useList
export const useDailyHadith = queries.useOne
export const useCreateHadith = queries.useCreate
export const useUpdateHadith = queries.useUpdate
export const useDeleteHadith = queries.useRemove

// Non-CRUD hooks — kept hand-rolled because they have shape the factory
// doesn't support (no `id` param, distinct return types, dedicated keys).

export function useTodayHadith() {
	return useQuery({
		queryKey: queryKeys.dailyHadiths.today(),
		queryFn: async () => (await dailyHadithsService.today()).data,
	})
}

export function useHadithPins() {
	return useQuery({
		queryKey: queryKeys.dailyHadiths.pins(),
		queryFn: async () => (await dailyHadithsService.listPins()).data,
	})
}

export function usePinHadith() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (body: { pin_date: string; hadith_id: string }) =>
			dailyHadithsService.pin(body),
		onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.dailyHadiths.pins() }),
	})
}

export function useUnpinHadith() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (pin_date: string) => dailyHadithsService.unpin(pin_date),
		onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.dailyHadiths.pins() }),
	})
}
