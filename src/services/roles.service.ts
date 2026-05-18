import { api } from "@/lib/api"
import type { Role, Permission, PaginatedResponse } from "@/types"

/**
 * The API returns roles with permissions in raw Prisma join shape:
 *   role_permissions: [{ permissions: { id, name, ... } }]
 * The DTO claims a flat `permissions: PermissionDto[]`, but the wire reality
 * is the nested form — and our UI reads `role.permissions.length`, so missing
 * normalisation crashes the roles page. Flatten on the way in.
 */
type RawRole = Role & {
	role_permissions?: Array<{ permissions?: Partial<Permission> | null }>
}

function normalizeRole(raw: RawRole | Role): Role {
	const r = raw as RawRole
	if (Array.isArray(r.permissions)) return raw as Role
	const flat: Permission[] = Array.isArray(r.role_permissions)
		? r.role_permissions
				.map((rp) => rp.permissions)
				.filter((p): p is Permission => !!p && typeof p.id === "string" && typeof p.name === "string")
		: []
	return { ...(raw as Role), permissions: flat }
}

export const rolesService = {
	list: async () => {
		const res = await api.get<PaginatedResponse<RawRole>>("/roles")
		return {
			...res,
			data: {
				...res.data,
				items: res.data.items.map(normalizeRole),
			},
		}
	},

	get: async (id: string) => {
		const res = await api.get<RawRole>(`/roles/${id}`)
		return { ...res, data: normalizeRole(res.data) }
	},

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
