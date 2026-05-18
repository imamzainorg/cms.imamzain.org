import { useQuery } from "@tanstack/react-query"
import { postCategoriesService } from "@/services/post-categories.service"
import { queryKeys } from "./keys"

type ListParams = { page?: number; limit?: number }

export function usePostCategoriesList(params: ListParams = { limit: 100 }) {
	return useQuery({
		queryKey: queryKeys.postCategories.list(params),
		queryFn: async () => (await postCategoriesService.list(params)).data,
	})
}
