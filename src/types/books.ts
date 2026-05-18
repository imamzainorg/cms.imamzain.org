import type { CategoryTranslation } from "./categories"
import type { EmbeddedMedia } from "./media"

export type BookTranslationItem = {
	lang: string
	title: string
	author: string | null
	publisher: string | null
	description: string | null
	series: string | null
	is_default: boolean
}

export type BookCategory = {
	id: string
	created_at: string
	book_category_translations: CategoryTranslation[]
	translation?: CategoryTranslation | null
}

export type Book = {
	id: string
	category_id: string
	cover_image_id: string | null
	isbn: string | null
	pages: number | null
	publish_year: string | null
	part_number: number | null
	parts: number | null
	views: number
	created_at: string
	updated_at: string
	book_translations: BookTranslationItem[]
	translation: BookTranslationItem | null
	book_categories?: BookCategory | null
	media?: EmbeddedMedia | null
}
