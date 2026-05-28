import type { CategoryTranslation } from "./categories"

export type GalleryImageTranslationItem = {
	lang: string
	title: string
	description: string | null
}

export type GalleryMedia = {
	id: string
	url: string
	mime_type: string
	width: number | null
	height: number | null
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
