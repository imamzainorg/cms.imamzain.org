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
