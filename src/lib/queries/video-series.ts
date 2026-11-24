import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { videoSeriesService } from "@/services/video-series.service"
import type { UpdateVideoSeries } from "@/types/video-series"

// Keys live here, not in keys.ts: the per-video screen is built in parallel and
// both would otherwise edit the same shared file.
export const videoSeriesKeys = {
	all: ["video-series"] as const,
	list: () => [...videoSeriesKeys.all, "list"] as const,
	settings: () => ["video-settings"] as const,
}

export function useVideoSeriesList() {
	return useQuery({
		queryKey: videoSeriesKeys.list(),
		queryFn: async () => (await videoSeriesService.list()).data,
	})
}

export function useUpdateVideoSeries() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ playlistId, body }: { playlistId: string; body: UpdateVideoSeries }) =>
			videoSeriesService.update(playlistId, body),
		onSuccess: () => qc.invalidateQueries({ queryKey: videoSeriesKeys.all }),
	})
}

export function useVideoSettings() {
	return useQuery({
		queryKey: videoSeriesKeys.settings(),
		queryFn: async () => (await videoSeriesService.getSettings()).data,
	})
}

export function useUpdateVideoSettings() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (autoPublish: boolean) =>
			videoSeriesService.updateSettings({ auto_publish: autoPublish }),
		onSuccess: (res) => qc.setQueryData(videoSeriesKeys.settings(), res.data),
	})
}
