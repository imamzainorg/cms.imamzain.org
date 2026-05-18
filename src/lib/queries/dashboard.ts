import { useQuery } from "@tanstack/react-query"
import { dashboardService } from "@/services/dashboard.service"
import { queryKeys } from "./keys"

/**
 * Single round-trip for the dashboard headline counts.
 * Replaces the 8-parallel-query fan-out the dashboard page used to do.
 */
export function useDashboardStats() {
	return useQuery({
		queryKey: queryKeys.dashboard.stats(),
		queryFn: async () => (await dashboardService.stats()).data,
		staleTime: 30_000,
	})
}
