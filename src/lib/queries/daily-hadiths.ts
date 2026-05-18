import {
	useMutation,
	useQuery,
	useQueryClient,
	keepPreviousData,
} from "@tanstack/react-query"
import { dailyHadithsService } from "@/services/daily-hadiths.service"
import { queryKeys } from "./keys"

type ListParams = { page?: number; limit?: number }

type CreateBody = Parameters<typeof dailyHadithsService.create>[0]
type UpdateBody = Parameters<typeof dailyHadithsService.update>[1]

export function useDailyHadithsList(params: ListParams = {}) {
	return useQuery({
		queryKey: queryKeys.dailyHadiths.list(params),
		queryFn: async () => (await dailyHadithsService.list(params)).data,
		placeholderData: keepPreviousData,
	})
}

export function useDailyHadith(id: string | undefined) {
	return useQuery({
		queryKey: queryKeys.dailyHadiths.detail(id ?? ""),
		queryFn: async () => (await dailyHadithsService.get(id!)).data,
		enabled: !!id,
	})
}

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

export function useCreateHadith() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (body: CreateBody) => dailyHadithsService.create(body),
		onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.dailyHadiths.all }),
	})
}

export function useUpdateHadith() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ id, body }: { id: string; body: UpdateBody }) =>
			dailyHadithsService.update(id, body),
		onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.dailyHadiths.all }),
	})
}

export function useDeleteHadith() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => dailyHadithsService.remove(id),
		onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.dailyHadiths.all }),
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
