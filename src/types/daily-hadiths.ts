export type DailyHadithTranslation = {
	lang: string
	content: string
	source: string | null
	is_default: boolean
}

export type DailyHadith = {
	id: string
	display_order: number | null
	is_active: boolean
	created_at: string
	updated_at: string
	daily_hadith_translations: DailyHadithTranslation[]
	translation: DailyHadithTranslation | null
}

export type DailyHadithToday = {
	id: string
	content: string
	source: string | null
	lang: string
	is_pinned: boolean
} | null

export type DailyHadithPin = {
	pin_date: string
	hadith_id: string
	created_at: string
}
