import {
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query"
import { rolesService } from "@/services/roles.service"
import type { Role, Permission } from "@/types"
import { queryKeys } from "./keys"

type CreateBody = Parameters<typeof rolesService.create>[0]
type UpdateBody = Parameters<typeof rolesService.update>[1]

export function useRolesList() {
	return useQuery({
		queryKey: queryKeys.roles.list(),
		queryFn: async () => (await rolesService.list()).data,
	})
}

export function usePermissionsList() {
	return useQuery({
		queryKey: queryKeys.roles.permissions(),
		queryFn: async () => (await rolesService.listPermissions()).data,
	})
}

export function useCreateRole() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (body: CreateBody) => rolesService.create(body),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.roles.lists() })
		},
	})
}

export function useUpdateRole() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ id, body }: { id: string; body: UpdateBody }) =>
			rolesService.update(id, body),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.roles.lists() })
		},
	})
}

export function useDeleteRole() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => rolesService.remove(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.roles.lists() })
		},
	})
}

// Permission assignment uses optimistic updates so the checkbox flips instantly.
// On error the snapshot is restored.
type TogglePermVars = { roleId: string; permission: Permission; has: boolean }

export function useTogglePermission() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ roleId, permission, has }: TogglePermVars) =>
			has
				? rolesService.removePermission(roleId, permission.id)
				: rolesService.assignPermission(roleId, permission.id),
		onMutate: async ({ roleId, permission, has }) => {
			await qc.cancelQueries({ queryKey: queryKeys.roles.lists() })
			const snapshots = qc.getQueriesData<{ items: Role[]; pagination: unknown }>({
				queryKey: queryKeys.roles.lists(),
			})
			snapshots.forEach(([key, data]) => {
				if (!data) return
				qc.setQueryData(key, {
					...data,
					items: data.items.map((r) => {
						if (r.id !== roleId) return r
						const current = r.permissions ?? []
						const perms = has
							? current.filter((p) => p.id !== permission.id)
							: [...current, permission]
						return { ...r, permissions: perms }
					}),
				})
			})
			return { snapshots }
		},
		onError: (_e, _vars, ctx) => {
			ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data))
		},
		onSettled: () => {
			qc.invalidateQueries({ queryKey: queryKeys.roles.lists() })
		},
	})
}
