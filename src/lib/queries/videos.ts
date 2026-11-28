import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { videosService } from "@/services/videos.service"
import type { VideoKind, VideoStatus, VideoUpdateBody } from "@/types/videos"
import { queryKeys } from "./keys"

type ListParams = {
	page?: number
	limit?: number
	status?: VideoStatus
	kind?: VideoKind
	search?: string
}

// Hand-rolled (not the CRUD factory): videos are mirrored from YouTube, so
// there is no create/delete, and the update is keyed by the YouTube video id.

export function useVideosList(params: ListParams = {}) {
	return useQuery({
		queryKey: queryKeys.videos.list(params),
		queryFn: async () => (await videosService.list(params)).data,
		placeholderData: keepPreviousData,
	})
}

/**
 * Refetch rather than patch the cache: the list is filtered by status
 * server-side, so a publish can move a row out of the current tab.
 */
export function useUpdateVideo() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ videoId, body }: { videoId: string; body: VideoUpdateBody }) =>
			videosService.update(videoId, body),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.videos.lists() })
		},
	})
}
