/**
 * Shared category-translation shape used across post/book/paper/gallery categories.
 *
 * Per the live API, each category translation has:
 *   { category_id, lang, title, slug, description }
 * (NOT `name` and NOT `is_default` as the OpenAPI spec suggests.)
 * The "default" translation is resolved server-side via the singular `translation` field.
 */
export type CategoryTranslation = {
	category_id?: string
	lang: string
	title: string
	slug?: string
	description?: string | null
}
