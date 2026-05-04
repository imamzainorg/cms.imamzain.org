import { api } from "@/lib/api"
import type { AdminUser } from "@/types"

export const usersService = {
	list: (params?: { page?: number; limit?: number }) =>
		api.get<{ users: AdminUser[]; total: number }>("/users", { params }),

	get: (id: string) => api.get<AdminUser>(`/users/${id}`),

	create: (body: { username: string; password: string }) =>
		api.post<AdminUser>("/users", body),

	update: (id: string, body: { username?: string }) =>
		api.patch<AdminUser>(`/users/${id}`, body),

	remove: (id: string) => api.delete(`/users/${id}`),

	assignRole: (userId: string, roleId: string) =>
		api.post(`/users/${userId}/roles`, { roleId }),

	removeRole: (userId: string, roleId: string) =>
		api.delete(`/users/${userId}/roles/${roleId}`),
}