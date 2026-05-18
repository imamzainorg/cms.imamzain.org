import {
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query"
import { settingsService } from "@/services/settings.service"
import type { UpsertSetting } from "@/types"
import { queryKeys } from "./keys"

export function useSettingsList() {
	return useQuery({
		queryKey: queryKeys.settings.list(),
		queryFn: async () => (await settingsService.listAll()).data,
	})
}

export function useSetting(key: string | undefined) {
	return useQuery({
		queryKey: queryKeys.settings.key(key ?? ""),
		queryFn: async () => (await settingsService.get(key!)).data,
		enabled: !!key,
	})
}

export function useUpsertSetting() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ key, body }: { key: string; body: UpsertSetting }) =>
			settingsService.upsert(key, body),
		onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.settings.all }),
	})
}

export function useDeleteSetting() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (key: string) => settingsService.remove(key),
		onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.settings.all }),
	})
}
