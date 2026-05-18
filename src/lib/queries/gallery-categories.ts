import { useQuery } from "@tanstack/react-query"
import { galleryCategoriesService } from "@/services/gallery-categories.service"
import { queryKeys } from "./keys"

type ListParams = { page?: number; limit?: number }

export function useGalleryCategoriesList(params: ListParams = { limit: 100 }) {
	return useQuery({
		queryKey: queryKeys.galleryCategories.list(params),
		queryFn: async () => (await galleryCategoriesService.list(params)).data,
	})
}
