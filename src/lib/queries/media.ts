import {
	useMutation,
	useQuery,
	useQueryClient,
	keepPreviousData,
} from "@tanstack/react-query"
import { mediaService } from "@/services/media.service"
import { queryKeys } from "./keys"

type ListParams = {
	page?: number
	limit?: number
	search?: string
	mime_type?: string
}

/** How often the library re-reads itself while some image is still getting its variants. */
export const MEDIA_PROCESSING_REFETCH_MS = 4000

export function useMediaList(params: ListParams) {
	return useQuery({
		queryKey: queryKeys.media.list(params),
		queryFn: async () => (await mediaService.list(params)).data,
		placeholderData: keepPreviousData,
		// A fresh upload shows "processing" for a few seconds (up to 2 minutes
		// for an animated GIF). Re-read until nothing on the page is, so tiles
		// flip to ready by themselves instead of needing a manual refresh.
		refetchInterval: (query) =>
			query.state.data?.items.some((m) => m.variants_status === "processing")
				? MEDIA_PROCESSING_REFETCH_MS
				: false,
	})
}

export function useMedia(id: string | undefined) {
	return useQuery({
		queryKey: queryKeys.media.detail(id ?? ""),
		queryFn: async () => (await mediaService.get(id!)).data,
		enabled: !!id,
	})
}

/** Where a file is still used. Loaded on demand (`enabled`) — it is a panel, not page data. */
export function useMediaReferences(id: string | undefined, enabled: boolean) {
	return useQuery({
		queryKey: queryKeys.media.references(id ?? ""),
		queryFn: async () => (await mediaService.references(id!)).data,
		enabled: !!id && enabled,
	})
}

export function useUploadMedia() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (file: File) => mediaService.uploadFile(file),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.media.all })
		},
	})
}

export function useUpdateMedia() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ id, body }: { id: string; body: Partial<{ filename: string; alt_text: string }> }) =>
			mediaService.update(id, body),
		onSuccess: (_data, { id }) => {
			qc.invalidateQueries({ queryKey: queryKeys.media.lists() })
			qc.invalidateQueries({ queryKey: queryKeys.media.detail(id) })
		},
	})
}

export function useDeleteMedia() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => mediaService.remove(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.media.all })
		},
	})
}

/**
 * Regenerate the WebP variants (320/768/1280/1920) for a media item. Offer it
 * only when `variants_status === "partial"` — for `unavailable` and
 * `not_applicable` there is nothing it can make. It also strips EXIF/GPS from
 * the stored original, and is rate-limited to 10/min.
 */
export function useRegenerateVariants() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => mediaService.regenerateVariants(id),
		onSuccess: (_data, id) => {
			qc.invalidateQueries({ queryKey: queryKeys.media.lists() })
			qc.invalidateQueries({ queryKey: queryKeys.media.detail(id) })
		},
	})
}
