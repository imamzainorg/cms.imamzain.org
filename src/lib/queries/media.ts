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

export function useMediaList(params: ListParams) {
	return useQuery({
		queryKey: queryKeys.media.list(params),
		queryFn: async () => (await mediaService.list(params)).data,
		placeholderData: keepPreviousData,
	})
}

export function useMedia(id: string | undefined) {
	return useQuery({
		queryKey: queryKeys.media.detail(id ?? ""),
		queryFn: async () => (await mediaService.get(id!)).data,
		enabled: !!id,
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
 * Regenerate the WebP variants (320/768/1280/1920) for a media item. Useful when
 * the original sharp pipeline failed mid-upload (variants[] came back empty).
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
