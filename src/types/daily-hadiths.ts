export type DailyHadithTranslation = {
	lang: string
	content: string
	source: string | null
}

/**
 * An admin row (`/daily-hadiths/admin*`, `/trash`). Each hadith belongs to at
 * most one Hijri day (month 1–12, day 1–30), both set or both null; a hadith
 * without a day is kept but never shown on the site.
 */
export type DailyHadith = {
	id: string
	hijri_month: number | null
	hijri_day: number | null
	created_at: string
	updated_at: string
	daily_hadith_translations: DailyHadithTranslation[]
	translation: DailyHadithTranslation | null
}

/** One item of the public browse list (`GET /daily-hadiths`): a single resolved language. */
export type HadithCalendarItem = {
	id: string
	hijri_month: number | null
	hijri_day: number | null
	content: string
	source: string | null
	lang: string
}

export type DailyHadithToday = {
	id: string
	content: string
	source: string | null
	lang: string
} | null

/** Where the API got today's Hijri date: sistani.org, set by hand, or the Umm al-Qura fallback. */
export type HijriSource = "sistani" | "manual" | "calendar"

export type HijriDateInfo = {
	year: number
	month: number
	day: number
	month_name: string
	/** True until sistani.org has been read on the day after a 29th. */
	provisional: boolean
	source: HijriSource
}

/** `GET /daily-hadiths/hijri-date` → data. `date` is the Gregorian site date. */
export type HijriToday = HijriDateInfo & { date: string }

/** `GET /daily-hadiths/today` → meta. */
export type DailyHadithTodayMeta = {
	date: string
	hijri: HijriDateInfo
	source: "scheduled" | "empty"
}

/** `POST /daily-hadiths/:id/restore` → meta (the body's `data` is null). */
export type HadithRestoreMeta = {
	unscheduled: boolean
	previous_hijri_month: number | null
	previous_hijri_day: number | null
}
