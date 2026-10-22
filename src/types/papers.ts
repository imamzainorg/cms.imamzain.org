import type { CategoryTranslation } from "./categories"

export type AcademicPaperTranslationItem = {
	lang: string
	title: string
	abstract: string | null
	authors: string[]
	keywords: string[]
	publication_venue: string | null
	page_count: number | null
	is_default: boolean
}

export type AcademicPaperCategory = {
	id: string
	created_at: string
	academic_paper_category_translations: CategoryTranslation[]
	translation?: CategoryTranslation | null
}

export type AcademicPaper = {
	id: string
	category_id: string
	published_year: string | null
	pdf_url: string | null
	/** ISO 639-1 codes for the language(s) the PDF file itself is in — distinct from translations[].lang. */
	document_languages: string[]
	views: number
	is_published: boolean
	created_at: string
	updated_at: string
	academic_paper_translations: AcademicPaperTranslationItem[]
	translation: AcademicPaperTranslationItem | null
	academic_paper_categories: AcademicPaperCategory
}
