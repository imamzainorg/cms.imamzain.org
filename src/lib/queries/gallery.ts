import { useMutation, useQueryClient } from "@tanstack/react-query"
import { galleryService } from "@/services/gallery.service"
import { queryKeys } from "./keys"
import { makeResourceQueries } from "./factory"
import type { GalleryImage, PaginatedResponse } from "@/types"

type ListParams = {
	page?: number
	limit?: number
	category_id?: string
}

type CreateBody = Parameters<typeof galleryService.create>[0]
type UpdateBody = Parameters<typeof galleryService.update>[1]

const queries = makeResourceQueries<
	GalleryImage,
	PaginatedResponse<GalleryImage>,
	CreateBody,
	UpdateBody,
	ListParams
>({
	service: galleryService,
	keys: queryKeys.gallery,
	defaultListParams: { limit: 100 },
})

export const useGalleryList = queries.useList
/** Full record (list payloads are slim — translations drop `description`). */
export const useGalleryImage = queries.useOne
export const useCreateGalleryItem = queries.useCreate
export const useUpdateGalleryItem = queries.useUpdate
export const useDeleteGalleryItem = queries.useRemove

/**
 * Optimistic publish toggle (audios pattern): flip every cached list page
 * immediately, roll back on error.
 */
export function useTogglePublishGallery() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ id, is_published }: { id: string; is_published: boolean }) =>
			galleryService.togglePublish(id, is_published),
		onMutate: async ({ id, is_published }) => {
			await qc.cancelQueries({ queryKey: queryKeys.gallery.lists() })
			const snapshots = qc.getQueriesData<PaginatedResponse<GalleryImage>>({
				queryKey: queryKeys.gallery.lists(),
			})
			snapshots.forEach(([key, data]) => {
				if (!data) return
				qc.setQueryData<PaginatedResponse<GalleryImage>>(key, {
					...data,
					items: data.items.map((g) =>
						g.media_id === id ? { ...g, is_published } : g,
					),
				})
			})
			return { snapshots }
		},
		onError: (_e, _vars, ctx) => {
			ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data))
		},
		onSettled: () => {
			qc.invalidateQueries({ queryKey: queryKeys.gallery.lists() })
		},
	})
}
