import {
	useMutation,
	useQuery,
	useQueryClient,
	keepPreviousData,
} from "@tanstack/react-query"
import { galleryService } from "@/services/gallery.service"
import { queryKeys } from "./keys"

type ListParams = {
	page?: number
	limit?: number
	category_id?: string
}

type CreateBody = Parameters<typeof galleryService.create>[0]
type UpdateBody = Parameters<typeof galleryService.update>[1]

export function useGalleryList(params: ListParams = { limit: 100 }) {
	return useQuery({
		queryKey: queryKeys.gallery.list(params),
		queryFn: async () => (await galleryService.list(params)).data,
		placeholderData: keepPreviousData,
	})
}

export function useCreateGalleryItem() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (body: CreateBody) => galleryService.create(body),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.gallery.lists() })
		},
	})
}

export function useUpdateGalleryItem() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ id, body }: { id: string; body: UpdateBody }) =>
			galleryService.update(id, body),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.gallery.lists() })
		},
	})
}

export function useDeleteGalleryItem() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => galleryService.remove(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.gallery.lists() })
		},
	})
}
