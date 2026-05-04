import { api } from "@/lib/api"
import type { ContestAttempt } from "@/types"

export const contestService = {
	listAttempts: (params?: { page?: number; limit?: number; submitted?: "true" | "false" }) =>
		api.get<{ attempts: ContestAttempt[]; total: number }>(
			"/forms/qutuf-sajjadiya-contest/attempts",
			{ params }
		),
}