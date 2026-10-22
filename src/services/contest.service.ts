import { api } from "@/lib/api"
import { toContestAttempt } from "@/types/contest"
import type { ContestAttempt, ContestAttemptRow, PaginatedResponse } from "@/types"

export const contestService = {
	// 'submitted' takes exactly "true" or "false" (anything else is a 400).
	listAttempts: async (params?: { page?: number; limit?: number; submitted?: "true" | "false" }) => {
		const res = await api.get<PaginatedResponse<ContestAttemptRow>>(
			"/forms/qutuf-sajjadiya-contest/attempts",
			{ params },
		)
		return {
			...res,
			data: {
				...res.data,
				items: res.data.items.map(toContestAttempt),
			} satisfies PaginatedResponse<ContestAttempt>,
		}
	},
}
