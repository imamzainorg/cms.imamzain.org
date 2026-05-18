import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { contestService } from "@/services/contest.service"
import { queryKeys } from "./keys"

type ListParams = {
	page?: number
	limit?: number
	submitted?: "true" | "false"
}

export function useContestAttemptsList(params: ListParams) {
	return useQuery({
		queryKey: queryKeys.contest.attemptsList(params),
		queryFn: async () => (await contestService.listAttempts(params)).data,
		placeholderData: keepPreviousData,
	})
}

export function useContestAttemptsCount(filter: { submitted?: "true" | "false" }) {
	return useQuery({
		queryKey: queryKeys.contest.attemptsList({ count: true, ...filter }),
		queryFn: async () => {
			const r = await contestService.listAttempts({ limit: 1, ...filter })
			return r.data.pagination.total
		},
	})
}
