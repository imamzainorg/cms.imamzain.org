import { api } from "@/lib/api"
import type { ContestAttempt, PaginatedResponse } from "@/types"

export const contestService = {
	listAttempts: (params?: { page?: number; limit?: number; submitted?: "true" | "false" }) =>
		api.get<PaginatedResponse<ContestAttempt>>(
			"/forms/qutuf-sajjadiya-contest/attempts",
			{ params }
		),
}
