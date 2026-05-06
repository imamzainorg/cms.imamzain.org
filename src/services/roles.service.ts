import { api } from "@/lib/api"
import type { Role, Permission, PaginatedResponse } from "@/types"

export const rolesService = {
	list: () => api.get<PaginatedResponse<Role>>("/roles"),

	get: (id: string) => api.get<Role>(`/roles/${id}`),

	create: (body: { name: string; translations: { lang: string; title: string; description?: string }[] }) =>
		api.post<Role>("/roles", body),

	update: (id: string, body: { name?: string; translations?: { lang: string; title: string; description?: string }[] }) =>
		api.patch<Role>(`/roles/${id}`, body),

	remove: (id: string) => api.delete(`/roles/${id}`),

	listPermissions: () => api.get<PaginatedResponse<Permission>>("/roles/permissions"),

	assignPermission: (roleId: string, permissionId: string) =>
		api.post(`/roles/${roleId}/permissions`, { permissionId }),

	removePermission: (roleId: string, permissionId: string) =>
		api.delete(`/roles/${roleId}/permissions/${permissionId}`),
}
