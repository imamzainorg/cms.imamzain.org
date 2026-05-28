/**
 * Shared category-translation shape used across post / book / paper / gallery
 * categories. Matches PostCategoryTranslationDto et al. on the API:
 *   { lang, title, slug, description? }
 */
export type CategoryTranslation = {
	lang: string
	title: string
	slug: string
	description?: string | null
}
