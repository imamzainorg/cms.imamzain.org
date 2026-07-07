import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query"
import { speakersService } from "@/services/speakers.service"
import { queryKeys } from "./keys"

type ListParams = {
	page?: number
	limit?: number
	search?: string
}

// Mutations are hand-rolled (not factory) because every speaker change must
// also refresh audios lists — audio rows embed the speaker name.

export function useSpeakersList(params: ListParams = {}) {
	return useQuery({
		queryKey: queryKeys.speakers.list(params),
		queryFn: async () => (await speakersService.list(params)).data,
		placeholderData: keepPreviousData,
	})
}

export function useSpeaker(id: string | undefined) {
	return useQuery({
		queryKey: queryKeys.speakers.detail(id ?? ""),
		queryFn: async () => (await speakersService.get(id!)).data,
		enabled: !!id,
	})
}

export function useCreateSpeaker() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (body: Parameters<typeof speakersService.create>[0]) =>
			speakersService.create(body),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.speakers.lists() })
			qc.invalidateQueries({ queryKey: queryKeys.audios.lists() })
		},
	})
}

export function useUpdateSpeaker() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ id, body }: {
			id: string
			body: Parameters<typeof speakersService.update>[1]
		}) => speakersService.update(id, body),
		onSuccess: (_data, { id }) => {
			qc.invalidateQueries({ queryKey: queryKeys.speakers.lists() })
			qc.invalidateQueries({ queryKey: queryKeys.speakers.detail(id) })
			qc.invalidateQueries({ queryKey: queryKeys.audios.lists() })
		},
	})
}

/** Soft delete — 409s while live audios still reference the speaker. */
export function useDeleteSpeaker() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => speakersService.remove(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.speakers.lists() })
			qc.invalidateQueries({ queryKey: queryKeys.audios.lists() })
			qc.invalidateQueries({ queryKey: queryKeys.trash.all })
		},
	})
}

export function useRestoreSpeaker() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => speakersService.restore(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.speakers.lists() })
			qc.invalidateQueries({ queryKey: queryKeys.audios.lists() })
			qc.invalidateQueries({ queryKey: queryKeys.trash.all })
		},
	})
}

