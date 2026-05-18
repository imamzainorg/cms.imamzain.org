import { useQuery } from "@tanstack/react-query"
import { paperCategoriesService } from "@/services/paper-categories.service"
import { queryKeys } from "./keys"

type ListParams = { page?: number; limit?: number }

export function usePaperCategoriesList(params: ListParams = { limit: 100 }) {
	return useQuery({
		queryKey: queryKeys.paperCategories.list(params),
		queryFn: async () => (await paperCategoriesService.list(params)).data,
	})
}
