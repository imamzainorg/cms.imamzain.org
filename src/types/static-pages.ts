import type { EmbeddedMedia } from "./media"

export type StaticPageTranslationItem = {
	lang: string
	title: string
	slug: string
	body: string
	is_default: boolean
	/** SEO override; falls back to `title` server-side if null. */
	meta_title?: string | null
	/** SEO override; server derives one from the body if null. */
	meta_description?: string | null
	/** Per-translation OpenGraph image (media UUID). */
	og_image_id?: string | null
	/** Resolved OG image object — present on admin/public detail responses only. */
	og_image?: EmbeddedMedia | null
}

export type StaticPage = {
	id: string
	display_order: number
	is_published: boolean
	created_at: string
	updated_at: string
	static_page_translations: StaticPageTranslationItem[]
	/** Resolved translation for the request's Accept-Language, default fallback. */
	translation: StaticPageTranslationItem | null
}
