import { api } from "@/lib/api"
import type { UserSummary, UserDetail, PaginatedResponse } from "@/types"

export const usersService = {
	list: (params?: { page?: number; limit?: number }) =>
		api.get<PaginatedResponse<UserSummary>>("/users", { params }),

	get: (id: string) => api.get<UserDetail>(`/users/${id}`),

	create: (body: { username: string; password: string }) =>
		api.post<UserDetail>("/users", body),

	update: (id: string, body: { username?: string }) =>
		api.patch<UserDetail>(`/users/${id}`, body),

	remove: (id: string) => api.delete(`/users/${id}`),

	assignRole: (userId: string, roleId: string) =>
		api.post(`/users/${userId}/roles`, { role_id: roleId }),

	removeRole: (userId: string, roleId: string) =>
		api.delete(`/users/${userId}/roles/${roleId}`),
}
