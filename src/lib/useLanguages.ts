"use client"

import { useQuery } from "@tanstack/react-query"
import { languagesService } from "@/services/languages.service"
import type { Language } from "@/types"
import { queryKeys } from "@/lib/queries/keys"

const HARD_FALLBACK: Language[] = [
	{ code: "ar", name: "Arabic", native_name: "العربية", is_active: true },
	{ code: "en", name: "English", native_name: "English", is_active: true },
]

const NAME_AR: Record<string, string> = {
	ar: "العربية",
	en: "الإنجليزية",
	fr: "الفرنسية",
	es: "الإسبانية",
	de: "الألمانية",
	tr: "التركية",
	fa: "الفارسية",
	ur: "الأردية",
	ru: "الروسية",
	zh: "الصينية",
}

export function languageLabel(code: string, native?: string): string {
	return NAME_AR[code] || native || code.toUpperCase()
}

/**
 * Active languages. Backed by a single shared Query cache so that creating /
 * updating / deleting a language from the languages page invalidates every
 * form that lists languages. Falls back to ar+en if the API call fails.
 */
export function useActiveLanguages(): { languages: Language[]; loading: boolean } {
	const query = useQuery({
		queryKey: queryKeys.languages.active(),
		queryFn: async () => {
			const r = await languagesService.list()
			const data = r.data
			const list: Language[] = Array.isArray(data)
				? data
				: Array.isArray((data as { items?: Language[] })?.items)
					? (data as { items: Language[] }).items
					: HARD_FALLBACK
			return list.filter((l) => l.is_active !== false)
		},
		staleTime: 5 * 60_000,
	})

	return {
		languages: query.data ?? (query.isLoading ? [] : HARD_FALLBACK),
		loading: query.isLoading,
	}
}
