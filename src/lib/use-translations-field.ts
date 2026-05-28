"use client"

import { useCallback, useState } from "react"
import { toast } from "sonner"

type LangRef = { code: string }
type TranslationLike = { lang: string; is_default?: boolean }

type Options<T extends TranslationLike> = {
	/** Initial translations. */
	initial: T[]
	/** Active language codes the user can add. */
	languages: LangRef[]
	/** Factory for a blank translation when adding a new language. */
	makeBlank: (lang: string) => T
	/**
	 * If true, removing the active default elects the first remaining as the
	 * new default. If false (gallery), translations carry no `is_default`
	 * and removal is a plain filter.
	 */
	requireDefault?: boolean
	/** Fallback when the list would become empty. */
	emptyFallbackLang?: string
}

/**
 * State + add/remove/update/setDefault helpers for translation lists in
 * useState-based forms (daily-hadiths, gallery). Forms using react-hook-form
 * (posts, books, papers) use `<TranslationTabs>` with `useFieldArray` instead.
 *
 * The hook owns `translations`, `activeLang`, and the four mutation helpers.
 * The parent renders its own tab strip + per-field editors — only the bookkeeping
 * is shared.
 */
export function useTranslationsField<T extends TranslationLike>(opts: Options<T>) {
	const { initial, languages, makeBlank, requireDefault = true, emptyFallbackLang = "ar" } = opts

	const [translations, setTranslations] = useState<T[]>(initial)
	const [activeLang, setActiveLang] = useState<string>(initial[0]?.lang ?? emptyFallbackLang)

	const updateAt = useCallback((index: number, patch: Partial<T>) => {
		setTranslations((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)))
	}, [])

	const addLang = useCallback(() => {
		setTranslations((prev) => {
			const used = new Set(prev.map((t) => t.lang))
			const next = languages.find((l) => !used.has(l.code))
			if (!next) {
				toast.error("لا توجد لغات إضافية")
				return prev
			}
			setActiveLang(next.code)
			return [...prev, makeBlank(next.code)]
		})
	}, [languages, makeBlank])

	const removeAt = useCallback(
		(index: number) => {
			setTranslations((prev) => {
				const removed = prev[index]
				let next = prev.filter((_, i) => i !== index)
				if (next.length === 0) {
					next = [makeBlank(emptyFallbackLang)]
				} else if (requireDefault && !next.some((t) => t.is_default)) {
					next = next.map((t, i) => (i === 0 ? { ...t, is_default: true } : t))
				}
				if (removed && removed.lang === activeLang) {
					setActiveLang(next[0]?.lang ?? emptyFallbackLang)
				}
				return next
			})
		},
		[activeLang, emptyFallbackLang, makeBlank, requireDefault],
	)

	const setDefault = useCallback((index: number) => {
		setTranslations((prev) => prev.map((t, i) => ({ ...t, is_default: i === index })))
	}, [])

	return {
		translations,
		setTranslations,
		activeLang,
		setActiveLang,
		updateAt,
		addLang,
		removeAt,
		setDefault,
	}
}
