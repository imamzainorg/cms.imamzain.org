import { useMutation, useQueryClient } from "@tanstack/react-query"
import { audiosService } from "@/services/audios.service"
import type { Audio, PaginatedResponse } from "@/types"
import { queryKeys } from "./keys"
import { makeResourceQueries } from "./factory"

type ListParams = {
	page?: number
	limit?: number
	speaker_id?: string
	search?: string
	is_published?: boolean
}

type CreateBody = Parameters<typeof audiosService.create>[0]
type UpdateBody = Parameters<typeof audiosService.update>[1]

const queries = makeResourceQueries<
	Audio,
	PaginatedResponse<Audio>,
	CreateBody,
	UpdateBody,
	ListParams
>({
	service: audiosService,
	keys: queryKeys.audios,
})

export const useAudiosList = queries.useList
export const useAudio = queries.useOne
export const useCreateAudio = queries.useCreate
export const useUpdateAudio = queries.useUpdate

/** Soft delete — the row moves to trash, so both branches refresh. */
export function useDeleteAudio() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => audiosService.remove(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.audios.lists() })
			qc.invalidateQueries({ queryKey: queryKeys.trash.all })
		},
	})
}

export function useRestoreAudio() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => audiosService.restore(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.audios.lists() })
			qc.invalidateQueries({ queryKey: queryKeys.trash.all })
		},
	})
}

/**
 * Optimistic publish toggle (posts pattern): flip every cached list page
 * immediately, roll back on error.
 */
export function useTogglePublishAudio() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ id, is_published }: { id: string; is_published: boolean }) =>
			audiosService.togglePublish(id, is_published),
		onMutate: async ({ id, is_published }) => {
			await qc.cancelQueries({ queryKey: queryKeys.audios.lists() })
			const snapshots = qc.getQueriesData<PaginatedResponse<Audio>>({
				queryKey: queryKeys.audios.lists(),
			})
			snapshots.forEach(([key, data]) => {
				if (!data) return
				qc.setQueryData<PaginatedResponse<Audio>>(key, {
					...data,
					items: data.items.map((a) =>
						a.id === id ? { ...a, is_published } : a,
					),
				})
			})
			return { snapshots }
		},
		onError: (_e, _vars, ctx) => {
			ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data))
		},
		onSettled: () => {
			qc.invalidateQueries({ queryKey: queryKeys.audios.lists() })
		},
	})
}
