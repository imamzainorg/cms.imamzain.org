import type { CategoryTranslation } from "./categories"
import type { EmbeddedMedia } from "./media"

export type BookTranslationItem = {
	lang: string
	title: string
	author: string | null
	publisher: string | null
	description: string | null
	series: string | null
	meta_title?: string | null
	meta_description?: string | null
	og_image_id?: string | null
	is_default: boolean
}

export type BookCategory = {
	id: string
	created_at: string
	book_category_translations: CategoryTranslation[]
	translation?: CategoryTranslation | null
}

/**
 * A book row as the list, trash and create/update endpoints return it.
 *
 * Multi-part series: a series is ONE parent row (title, author, category,
 * cover — no PDF of its own) plus one row per volume, each pointing at the
 * parent. Volumes are hidden from every list (`parent_id: null` is part of the
 * base filter), so they are only reachable through the parent's detail.
 *
 * NOTE the series total (`parts` column, written together with `part_number`)
 * is write-only: no read response carries it — on a series parent's detail
 * `parts` is the ARRAY of volumes instead (see `BookDetail`).
 */
export type Book = {
	id: string
	category_id: string
	cover_image_id: string
	/** Single language-agnostic slug (top-level, unlike per-translation fields). */
	slug?: string | null
	isbn: string | null
	pages: number | null
	publish_year: string | null
	pdf_url?: string | null
	/** ISO 639-1 codes for the language(s) the PDF file itself is in — distinct from translations[].lang. */
	document_languages: string[]
	/** This volume's number within its series; null on an ordinary book. */
	part_number: number | null
	views: number
	is_published: boolean
	/** One of the institution's flagship «الإصدارات» — independent of the topic category. */
	is_publication: boolean
	/** Live volumes this row has: > 0 means it is a series parent. 0 on an ordinary book or a volume. */
	parts_count?: number
	created_at: string
	updated_at: string
	book_translations: BookTranslationItem[]
	translation: BookTranslationItem | null
	book_categories: BookCategory
	media: EmbeddedMedia
}

/** A volume as listed on its series parent's detail, already ordered by part_number. */
export type BookPart = {
	id: string
	slug: string | null
	part_number: number | null
	pages: number | null
	pdf_url: string | null
	media: EmbeddedMedia | null
	book_translations: BookTranslationItem[]
	translation: BookTranslationItem | null
}

/** On a volume's own detail: the series it belongs to (so the form can link back). */
export type BookParent = {
	id: string
	slug: string | null
	book_translations: BookTranslationItem[]
	translation: BookTranslationItem | null
}

/** `GET /books/admin/:id` — adds the series structure to a book row. */
export type BookDetail = Book & {
	/** Present on a series parent only. */
	parts?: BookPart[]
	/** Present on a volume only. */
	parent?: BookParent
}
