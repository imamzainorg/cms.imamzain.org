import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { contestService } from "@/services/contest.service"
import { settingsService } from "@/services/settings.service"
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

/**
 * Is the contest accepting attempts? The API reads the `contest_open` site
 * setting (a missing row counts as CLOSED) and answers 403 CONTEST_CLOSED to
 * /start and /submit unless it is exactly "true".
 *
 * Needs `settings:read`, which contest readers (e.g. moderators) may lack:
 * then `data` is `undefined` and the page shows no banner rather than a guess.
 */
export function useContestOpen() {
	return useQuery({
		queryKey: queryKeys.settings.key("contest_open"),
		queryFn: async (): Promise<boolean> => {
			try {
				const { data } = await settingsService.get("contest_open")
				return data.value === true || data.value === "true"
			} catch (e) {
				// No row yet = closed (fail closed, as the API does). Anything else
				// (403, network) = unknown.
				if ((e as { response?: { status?: number } }).response?.status === 404) return false
				throw e
			}
		},
		retry: false,
	})
}
