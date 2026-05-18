import type { CategoryTranslation } from "./categories"
import type { EmbeddedMedia } from "./media"

export type PostTranslationItem = {
	lang: string
	title: string
	summary: string | null
	body: string
	slug: string
	is_default: boolean
	/** SEO override; falls back to `title` server-side if null. */
	meta_title?: string | null
	/** SEO override; falls back to `summary` or a body excerpt server-side if null. */
	meta_description?: string | null
	/** OG image override; falls back to `cover_image_id` server-side if null. */
	og_image_id?: string | null
	/** Server-derived read time (~1000 chars/min). Minimum 1 for non-empty bodies. */
	reading_time_minutes?: number
}

export type PostCategory = {
	id: string
	created_at: string
	post_category_translations: CategoryTranslation[]
	translation?: CategoryTranslation | null
}

export type Post = {
	id: string
	category_id: string
	cover_image_id: string | null
	is_published: boolean
	is_featured?: boolean
	published_at: string | null
	views: number
	created_at: string
	updated_at: string
	post_translations: PostTranslationItem[]
	translation: PostTranslationItem | null
	post_categories?: PostCategory | null
	media?: EmbeddedMedia | null
}

/** Status filter values accepted by `GET /posts/admin?status=`. */
export type PostStatus = "draft" | "scheduled" | "published" | "all"
