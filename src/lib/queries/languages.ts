import {
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query"
import {
	languagesService,
	type CreateLanguageBody,
	type UpdateLanguageBody,
} from "@/services/languages.service"
import { queryKeys } from "./keys"

export function useAllLanguagesList() {
	return useQuery({
		queryKey: queryKeys.languages.allLanguages(),
		queryFn: async () => (await languagesService.listAll()).data,
	})
}

export function useCreateLanguage() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (body: CreateLanguageBody) => languagesService.create(body),
		onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.languages.all }),
	})
}

export function useUpdateLanguage() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ code, body }: { code: string; body: UpdateLanguageBody }) =>
			languagesService.update(code, body),
		onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.languages.all }),
	})
}

export function useDeleteLanguage() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (code: string) => languagesService.remove(code),
		onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.languages.all }),
	})
}
