import {
	useMutation,
	useQuery,
	useQueryClient,
	keepPreviousData,
} from "@tanstack/react-query"
import { usersService } from "@/services/users.service"
import { queryKeys } from "./keys"

type ListParams = { page?: number; limit?: number }

export function useUsersList(params: ListParams = { limit: 100 }) {
	return useQuery({
		queryKey: queryKeys.users.list(params),
		queryFn: async () => (await usersService.list(params)).data,
		placeholderData: keepPreviousData,
	})
}

export function useUser(id: string | undefined) {
	return useQuery({
		queryKey: queryKeys.users.detail(id ?? ""),
		queryFn: async () => (await usersService.get(id!)).data,
		enabled: !!id,
	})
}

export function useCreateUser() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (body: { username: string; password: string }) => usersService.create(body),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.users.lists() })
		},
	})
}

export function useUpdateUser() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ id, body }: { id: string; body: { username?: string; is_active?: boolean } }) =>
			usersService.update(id, body),
		onSuccess: (_data, { id }) => {
			qc.invalidateQueries({ queryKey: queryKeys.users.lists() })
			qc.invalidateQueries({ queryKey: queryKeys.users.detail(id) })
		},
	})
}

export function useDeleteUser() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => usersService.remove(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.users.lists() })
		},
	})
}

export function useAssignUserRole() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
			usersService.assignRole(userId, roleId),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.users.all })
		},
	})
}

export function useRemoveUserRole() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
			usersService.removeRole(userId, roleId),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.users.all })
		},
	})
}
