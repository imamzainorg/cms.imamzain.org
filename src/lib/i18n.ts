import type { CategoryTranslation } from "@/types"

/** UI display language for the CMS itself. */
export const UI_LANG = "ar"

/**
 * Pick the best translation for the current UI language.
 * Order: exact UI match → resolved `translation` (singular) → `is_default` → first non-empty.
 */
export function pickTranslation<T extends { lang: string }>(
	all: T[] | undefined | null,
	resolved?: T | null,
	uiLang: string = UI_LANG,
): T | undefined {
	if (!Array.isArray(all) || all.length === 0) {
		return resolved ?? undefined
	}
	const exact = all.find((t) => t.lang === uiLang)
	if (exact) return exact
	if (resolved) return resolved
	const def = all.find(
		(t) => (t as { is_default?: boolean }).is_default === true,
	)
	if (def) return def
	return all[0]
}

/**
 * Get the human-readable name of a category translation.
 * Live API uses `title`; the OpenAPI spec mistakenly says `name` — we accept both.
 */
export function categoryName(
	translations: CategoryTranslation[] | undefined,
	resolved?: CategoryTranslation | null,
): string {
	const t = pickTranslation(translations, resolved)
	if (!t) return "بدون اسم"
	const v = t.title || (t as unknown as { name?: string }).name || ""
	return v || "بدون اسم"
}

/**
 * Lightweight slug helper for auto-generation from titles.
 * Removes Arabic + non-ascii, collapses spaces to dashes.
 */
export function slugify(s: string): string {
	const slug = s
		.toLowerCase()
		.trim()
		.replace(/[؀-ۿݐ-ݿ]+/g, "")
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 80)
	return slug || `c-${Date.now().toString(36)}`
}
