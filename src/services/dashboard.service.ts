import { api } from "@/lib/api"
import type { DashboardStats } from "@/types/dashboard"

export const dashboardService = {
	stats: () => api.get<DashboardStats>("/dashboard/stats"),
}
