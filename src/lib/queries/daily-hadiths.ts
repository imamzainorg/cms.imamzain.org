import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query"
import { dailyHadithsService } from "@/services/daily-hadiths.service"
import { queryKeys } from "./keys"
import { makeResourceQueries } from "./factory"
import type {
	DailyHadith,
	DailyHadithTodayMeta,
	HadithRestoreMeta,
	PaginatedResponse,
} from "@/types"

type ListParams = { page?: number; limit?: number }
type CreateBody = Parameters<typeof dailyHadithsService.create>[0]
type UpdateBody = Parameters<typeof dailyHadithsService.update>[1]

// The "core 5" come from the factory. We use invalidate: "all" so that
// every mutation also refreshes the sibling queries (calendar, today,
// hijri-date) — moving a hadith to another Hijri day changes what all of
// them return, so the list-only invalidation default would leave them stale.
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

// Hand-rolled instead of queries.useRemove: soft-delete must also refresh the
// trash view, and the factory only knows about the resource's own branch.
export function useDeleteHadith() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => dailyHadithsService.remove(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.dailyHadiths.all })
			qc.invalidateQueries({ queryKey: queryKeys.trash.all })
		},
	})
}

export function useDailyHadithsTrash(params: { page?: number; limit?: number } = {}) {
	return useQuery({
		queryKey: queryKeys.trash.resource("daily-hadiths", params),
		queryFn: async () => (await dailyHadithsService.trash(params)).data,
		placeholderData: keepPreviousData,
	})
}

export function useRestoreHadith() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async (id: string) => {
			const res = await dailyHadithsService.restore(id)
			return {
				message: res.message,
				meta: res.meta as HadithRestoreMeta | undefined,
			}
		},
		onSuccess: () => {
			// `.all` (not `.lists()`) so the calendar and /today refresh too — a
			// restored hadith's Hijri day (if it kept one) is live again at once.
			qc.invalidateQueries({ queryKey: queryKeys.dailyHadiths.all })
			qc.invalidateQueries({ queryKey: queryKeys.trash.all })
		},
	})
}

// Non-CRUD hooks — hand-rolled because they have no `id` param and distinct
// return types/query keys from the factory's shapes.

/**
 * Browse the hadiths in Hijri calendar order, optionally one month (or one
 * day of a month). The admin list is newest-first, which is useless with one
 * hadith per day of the year; the API's own guidance is to browse by month.
 */
export function useHadithCalendar(
	params: { page?: number; limit?: number; hijri_month?: number; hijri_day?: number },
	options: { enabled?: boolean } = {},
) {
	return useQuery({
		queryKey: queryKeys.dailyHadiths.calendar(params),
		queryFn: async () => (await dailyHadithsService.calendar(params)).data,
		placeholderData: keepPreviousData,
		enabled: options.enabled ?? true,
	})
}

/** Today's hadith (or null) together with today's Hijri date from `meta`. */
export function useTodayHadith() {
	return useQuery({
		queryKey: queryKeys.dailyHadiths.today(),
		queryFn: async () => {
			const res = await dailyHadithsService.today()
			return { hadith: res.data, meta: res.meta as DailyHadithTodayMeta | undefined }
		},
	})
}

export function useHijriDate() {
	return useQuery({
		queryKey: queryKeys.dailyHadiths.hijriDate(),
		queryFn: async () => (await dailyHadithsService.hijriDate()).data,
	})
}

export function useSetHijriDate() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (body: { year: number; month: number; day: number }) =>
			dailyHadithsService.setHijriDate(body),
		onSuccess: () => {
			// Changing today's date changes which hadith is "today's" too.
			qc.invalidateQueries({ queryKey: queryKeys.dailyHadiths.all })
		},
	})
}
