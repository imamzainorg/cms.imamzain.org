import { api } from "@/lib/api"
import type { Setting, UpsertSetting } from "@/types"

export const settingsService = {
	listAll: () => api.get<Setting[]>("/settings"),
	get: (key: string) => api.get<Setting>(`/settings/${key}`),
	upsert: (key: string, body: UpsertSetting) => api.put<Setting>(`/settings/${key}`, body),
	remove: (key: string) => api.delete(`/settings/${key}`),
}
