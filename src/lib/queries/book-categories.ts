import { useQuery } from "@tanstack/react-query"
import { bookCategoriesService } from "@/services/book-categories.service"
import { queryKeys } from "./keys"

type ListParams = { page?: number; limit?: number }

export function useBookCategoriesList(params: ListParams = { limit: 100 }) {
	return useQuery({
		queryKey: queryKeys.bookCategories.list(params),
		queryFn: async () => (await bookCategoriesService.list(params)).data,
	})
}
