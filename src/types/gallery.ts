import type { CategoryTranslation } from "./categories"
import type { EmbeddedMediaVariant } from "./media"

export type GalleryImageTranslationItem = {
	lang: string
	title: string
	description: string | null
}

export type GalleryMedia = {
	id: string
	url: string
	filename?: string
	alt_text?: string | null
	mime_type: string
	width: number | null
	height: number | null
	/**
	 * srcset-ready WebP variants. NOTE: on the gallery wire the field keeps the
	 * Prisma relation name `media_variants` (the API embeds media via
	 * PUBLIC_MEDIA_SELECT / an include without renaming) — unlike the /media
	 * endpoints, which remap to `variants`.
	 */
	media_variants?: EmbeddedMediaVariant[]
}

export type GalleryImage = {
	media_id: string
	category_id: string | null
	taken_at: string | null
	author: string | null
	tags: string[]
	locations: string[]
	created_at: string
	updated_at: string
	media: GalleryMedia
	gallery_image_translations: GalleryImageTranslationItem[]
	translation: GalleryImageTranslationItem | null
}

export type GalleryCategory = {
	id: string
	created_at: string
	gallery_category_translations: CategoryTranslation[]
	translation?: CategoryTranslation | null
}
